import { test } from "node:test";
import { once } from "node:events";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createApp } from "../server/app.js";

test("upload, ordered playlists, durations, live assignments and restart persistence", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "opensign-"));
  let service = createApp(dir);
  let server = service.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = () =>
    `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = async (endpoint: string, body?: unknown, method = "POST") => {
    const response = await fetch(
      base() + endpoint,
      body === undefined
        ? undefined
        : {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    );
    return { status: response.status, data: await response.json() };
  };
  const stop = async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    service.db.close();
  };
  try {
    const media = [];
    for (const color of ["red", "green", "blue"]) {
      const buffer = await sharp({
        create: { width: 160, height: 90, channels: 3, background: color },
      })
        .png()
        .toBuffer();
      const form = new FormData();
      form.append(
        "image",
        new Blob([new Uint8Array(buffer)], { type: "image/png" }),
        `${color}.png`,
      );
      const r = await fetch(base() + "/api/media", {
        method: "POST",
        body: form,
      });
      assert.equal(r.status, 201);
      media.push(await r.json());
    }
    const bad = new FormData();
    bad.append(
      "image",
      new Blob(["<script>bad</script>"], { type: "image/png" }),
      "bad.png",
    );
    assert.equal(
      (await fetch(base() + "/api/media", { method: "POST", body: bad }))
        .status,
      400,
    );
    assert.equal((await request("/api/screens", { name: "   " })).status, 400);
    const screen = (await request("/api/screens", { name: "Test TV" })).data;
    assert.equal(
      (await request(`/api/player/${screen.id}`)).data.playlist,
      null,
    );
    const playlist = (
      await request("/api/playlists", { name: "Morning Announcements" })
    ).data;
    const items = media.map((m) => ({ mediaId: m.id, duration: 10 }));
    assert.equal(
      (
        await request(
          `/api/playlists/${playlist.id}`,
          { name: playlist.name, items },
          "PUT",
        )
      ).status,
      200,
    );
    await request(
      `/api/screens/${screen.id}`,
      { name: screen.name, playlistId: playlist.id },
      "PUT",
    );
    const player = (await request(`/api/player/${screen.id}`)).data;
    assert.deepEqual(
      player.playlist.items.map((i: { mediaId: string }) => i.mediaId),
      media.map((m) => m.id),
    );
    assert.deepEqual(
      player.playlist.items.map((i: { duration: number }) => i.duration),
      [10, 10, 10],
    );
    const changed = [
      { mediaId: media[2].id, duration: 3 },
      { mediaId: media[0].id, duration: 12 },
    ];
    await request(
      `/api/playlists/${playlist.id}`,
      { name: playlist.name, items: changed },
      "PUT",
    );
    assert.deepEqual(
      (await request(`/api/player/${screen.id}`)).data.playlist.items.map(
        (i: { mediaId: string; duration: number }) => ({
          mediaId: i.mediaId,
          duration: i.duration,
        }),
      ),
      changed,
    );
    assert.equal(
      (
        await request(
          `/api/playlists/${playlist.id}`,
          {
            name: playlist.name,
            items: [{ mediaId: media[0].id, duration: 0 }],
          },
          "PUT",
        )
      ).status,
      400,
    );
    await stop();
    service = createApp(dir);
    server = service.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const persisted = (await request(`/api/player/${screen.id}`)).data;
    assert.equal(persisted.screen.name, "Test TV");
    assert.equal(persisted.playlist.items[0].mediaId, media[2].id);
    assert.equal((await request("/api/state")).data.media.length, 3);
    assert.equal((await fetch(base() + media[0].url)).status, 200);
    assert.equal(
      (
        await fetch(base() + "/api/screens", {
          method: "POST",
          headers: {
            origin: "https://evil.example",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "no" }),
        })
      ).status,
      403,
    );
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
