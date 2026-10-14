import express from "express";
import multer from "multer";
import sharp from "sharp";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const nameSchema = z.string().trim().min(1).max(100);
const itemSchema = z.object({
  mediaId: z.string().uuid(),
  duration: z.number().int().min(1).max(3600),
});
export function createApp(dataDir: string) {
  mkdirSync(path.join(dataDir, "media"), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "opensign.sqlite"));
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,name TEXT NOT NULL,url TEXT NOT NULL,width INTEGER,height INTEGER);
 CREATE TABLE IF NOT EXISTS playlists(id TEXT PRIMARY KEY,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS items(playlist_id TEXT REFERENCES playlists(id) ON DELETE CASCADE,position INTEGER,media_id TEXT REFERENCES media(id),duration INTEGER NOT NULL,PRIMARY KEY(playlist_id,position));
 CREATE TABLE IF NOT EXISTS screens(id TEXT PRIMARY KEY,name TEXT NOT NULL,playlist_id TEXT REFERENCES playlists(id));`);
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    );
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host)
        return res
          .status(403)
          .json({ error: "Cross-origin changes are not allowed." });
    }
    next();
  });
  app.use(express.json({ limit: "128kb" }));
  app.use(
    "/media",
    express.static(path.join(dataDir, "media"), {
      immutable: true,
      maxAge: "1y",
      dotfiles: "deny",
    }),
  );
  const playlist = (id: string) => {
    const p = db.prepare("SELECT * FROM playlists WHERE id=?").get(id);
    if (!p) return null;
    return {
      ...p,
      items: db
        .prepare(
          "SELECT media.id AS mediaId,media.name,media.url,items.duration FROM items JOIN media ON media.id=items.media_id WHERE playlist_id=? ORDER BY position",
        )
        .all(id),
    };
  };
  app.get("/api/state", (_req, res) =>
    res.json({
      media: db.prepare("SELECT * FROM media ORDER BY rowid DESC").all(),
      playlists: db
        .prepare("SELECT id FROM playlists ORDER BY rowid")
        .all()
        .map((p) => playlist(p.id as string)),
      screens: db
        .prepare(
          "SELECT id,name,playlist_id AS playlistId FROM screens ORDER BY rowid",
        )
        .all(),
    }),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });
  app.post("/api/media", upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Choose an image." });
    const bytes = req.file.buffer;
    const supported =
      bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      (bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP");
    if (!supported)
      return res
        .status(400)
        .json({ error: "Only JPG, PNG and WebP images are supported." });
    const id = randomUUID();
    const file = path.join(dataDir, "media", `${id}.webp`);
    try {
      const input = sharp(req.file.buffer, {
        limitInputPixels: 40_000_000,
        animated: false,
      });
      const meta = await input.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
        (meta.pages ?? 1) > 1
      )
        return res
          .status(400)
          .json({
            error: "Only still JPG, PNG and WebP images are supported.",
          });
      const { data, info } = await input
        .rotate()
        .webp({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
      await writeFile(file, data, { flag: "wx" });
      const name =
        req.file.originalname.replace(/[\x00-\x1f]/g, "").slice(0, 200) ||
        "Image";
      db.prepare("INSERT INTO media VALUES(?,?,?,?,?)").run(
        id,
        name,
        `/media/${id}.webp`,
        info.width,
        info.height,
      );
      res
        .status(201)
        .json({
          id,
          name,
          url: `/media/${id}.webp`,
          width: info.width,
          height: info.height,
        });
    } catch {
      await unlink(file).catch(() => {});
      res
        .status(400)
        .json({
          error:
            "The image could not be read. Use a valid JPG, PNG or WebP (up to 10 MB and 40 megapixels).",
        });
    }
  });
  app.post("/api/playlists", (req, res) => {
    const name = nameSchema.parse(req.body?.name);
    const id = randomUUID();
    db.prepare("INSERT INTO playlists VALUES(?,?)").run(id, name);
    res.status(201).json(playlist(id));
  });
  app.put("/api/playlists/:id", (req, res) => {
    const body = z
      .object({ name: nameSchema, items: z.array(itemSchema).max(500) })
      .parse(req.body);
    if (!playlist(req.params.id))
      return res.status(404).json({ error: "Playlist not found." });
    if (
      body.items.some(
        (i) => !db.prepare("SELECT id FROM media WHERE id=?").get(i.mediaId),
      )
    )
      return res.status(400).json({ error: "An image no longer exists." });
    db.exec("BEGIN");
    try {
      db.prepare("UPDATE playlists SET name=? WHERE id=?").run(
        body.name,
        req.params.id,
      );
      db.prepare("DELETE FROM items WHERE playlist_id=?").run(req.params.id);
      body.items.forEach((i, pos) =>
        db
          .prepare("INSERT INTO items VALUES(?,?,?,?)")
          .run(req.params.id, pos, i.mediaId, i.duration),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    res.json(playlist(req.params.id));
  });
  app.post("/api/screens", (req, res) => {
    const name = nameSchema.parse(req.body?.name);
    const id = randomUUID();
    db.prepare("INSERT INTO screens VALUES(?,?,NULL)").run(id, name);
    res.status(201).json({ id, name, playlistId: null });
  });
  app.put("/api/screens/:id", (req, res) => {
    const b = z
      .object({ name: nameSchema, playlistId: z.string().uuid().nullable() })
      .parse(req.body);
    if (!db.prepare("SELECT id FROM screens WHERE id=?").get(req.params.id))
      return res.status(404).json({ error: "Screen not found." });
    if (b.playlistId && !playlist(b.playlistId))
      return res.status(400).json({ error: "Playlist not found." });
    db.prepare("UPDATE screens SET name=?,playlist_id=? WHERE id=?").run(
      b.name,
      b.playlistId,
      req.params.id,
    );
    res.json({ id: req.params.id, ...b });
  });
  app.get("/api/player/:id", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const screen = db
      .prepare(
        "SELECT id,name,playlist_id AS playlistId FROM screens WHERE id=?",
      )
      .get(req.params.id);
    if (!screen)
      return res
        .status(404)
        .json({
          error: "Screen not found. Open a player link from the dashboard.",
        });
    res.json({
      screen,
      playlist: screen.playlistId
        ? playlist(screen.playlistId as string)
        : null,
    });
  });
  app.get("/api/preview/:id", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const p = playlist(req.params.id);
    if (!p) return res.status(404).json({ error: "Playlist not found." });
    res.json({ screen: { name: "Playlist preview" }, playlist: p });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  app.use(express.static(path.resolve("dist")));
  app.get(/^\/(?!api|media).*/, (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof z.ZodError)
        return res
          .status(400)
          .json({
            error:
              "Check the values: names are required, and durations must be whole seconds between 1 and 3600.",
          });
      if (err instanceof multer.MulterError)
        return res
          .status(400)
          .json({ error: "Upload one image at a time, up to 10 MB." });
      if (err instanceof SyntaxError)
        return res.status(400).json({ error: "Invalid request." });
      console.error(err);
      res
        .status(500)
        .json({ error: "The server could not complete this request." });
    },
  );
  return { app, db };
}
