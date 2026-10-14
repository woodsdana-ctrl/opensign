import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
type Media = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
};
type Item = { mediaId: string; duration: number; name?: string; url?: string };
type Playlist = { id: string; name: string; items: Item[] };
type Screen = { id: string; name: string; playlistId: string | null };
type State = { media: Media[]; playlists: Playlist[]; screens: Screen[] };
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, options);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
const json = (body: unknown, method = "POST") => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function Player({ id, preview = false }: { id: string; preview?: boolean }) {
  const [content, setContent] = useState<{
    screen: { name: string };
    playlist: Playlist | null;
  } | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    let busy = false;
    const update = async () => {
      if (busy) return;
      busy = true;
      try {
        const next = await api<NonNullable<typeof content>>(
          `/api/${preview ? "preview" : "player"}/${encodeURIComponent(id)}`,
        );
        if (active) {
          setContent((old) =>
            JSON.stringify(old) === JSON.stringify(next) ? old : next,
          );
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        busy = false;
      }
    };
    void update();
    const poll = setInterval(update, 5000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [id, preview]);
  useEffect(() => {
    setIndex(0);
    setFailed([]);
  }, [content]);
  const items = content?.playlist?.items ?? [];
  const current = items[index % Math.max(1, items.length)];
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % items.length),
      current.duration * 1000,
    );
    return () => clearTimeout(timer);
  }, [current, index, items.length]);
  const missing = current?.url && failed.includes(current.url);
  return (
    <main className="player">
      {" "}
      <div className="stage">
        {current?.url && !missing ? (
          <img
            key={current.url}
            src={current.url}
            alt={current.name ?? "Announcement"}
            onError={() => setFailed((f) => [...f, current.url!])}
          />
        ) : (
          <div className="fallback">
            <div className="brandmark">O</div>
            <h1>
              {missing
                ? "Image unavailable"
                : (content?.screen.name ?? "OpenSign")}
            </h1>
            <p>
              {missing
                ? "The next announcement will appear shortly."
                : error && !content
                  ? error
                  : "Ready for your next announcement."}
            </p>
          </div>
        )}
      </div>
      {error && content && (
        <div className="connection">
          Connection lost · Playing last received content
        </div>
      )}
      {preview && (
        <div className="preview-tag">
          Playlist preview · {content?.playlist?.name}
        </div>
      )}
    </main>
  );
}
function Dashboard() {
  const [state, setState] = useState<State>({
    media: [],
    playlists: [],
    screens: [],
  });
  const [tab, setTab] = useState("Screens");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [draft, setDraft] = useState<Playlist | null>(null);
  const [dirty, setDirty] = useState(false);
  const load = async () => {
    setState(await api<State>("/api/state"));
    setLoaded(true);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  const action = async (work: () => Promise<void>, message: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await load();
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const change = (p: Playlist) => {
    setDraft(p);
    setDirty(true);
  };
  const switchTab = (next: string) => {
    if (dirty && !confirm("Discard unsaved playlist changes?")) return;
    setDraft(null);
    setDirty(false);
    setTab(next);
    setNewName("");
  };
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const totalSeconds = draft?.items.reduce((n, i) => n + i.duration, 0) ?? 0;
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          <span className="brandmark">O</span>OpenSign
        </a>
        <div className="district">
          BEMIDJI AREA SCHOOLS <span>District signage workspace</span>
        </div>
        <nav>
          {["Screens", "Media library", "Playlists"].map((n, i) => (
            <button
              key={n}
              className={tab === n ? "active" : ""}
              onClick={() => switchTab(n)}
            >
              <span>{["▣", "▧", "☷"][i]}</span>
              {n}
              <small>
                {
                  [
                    state.screens.length,
                    state.media.length,
                    state.playlists.length,
                  ][i]
                }
              </small>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="dot" /> Local prototype
          <p>
            Development device links
            <br />
            Authentication not enabled
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <span>
            District workspace / <strong>{tab}</strong>
          </span>
          <span className="badge">Version 1 · Local development</span>
        </header>
        <main className="admin">
          <div className="title-row">
            <div className="eyebrow">YOUR DISTRICT, ON DISPLAY</div>
            <h1>{tab}</h1>
            <p>
              {tab === "Screens"
                ? "Connect your displays to the announcements that matter."
                : tab === "Media library"
                  ? "A home for every announcement, welcome, and school moment."
                  : "Bring your images together. Set the order, then let them play."}
            </p>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
            </div>
          )}
          {!loaded && !error && <p>Loading your workspace…</p>}
          {tab === "Media library" && (
            <>
              <section className="upload-panel">
                <div>
                  <h2>Add something worth sharing</h2>
                  <p>JPG, PNG or WebP · Up to 10 MB each · Still images only</p>
                </div>
                <label className={`button ${busy ? "disabled" : ""}`}>
                  {busy ? "Uploading…" : "＋ Upload images"}
                  <input
                    aria-label="Upload images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={busy}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      if (files.length)
                        void action(async () => {
                          for (const file of files) {
                            const form = new FormData();
                            form.append("image", file);
                            await api("/api/media", {
                              method: "POST",
                              body: form,
                            });
                          }
                        }, "Images uploaded. Ready to add to a playlist.");
                    }}
                  />
                </label>
              </section>
              <div className="section-label">
                ALL MEDIA <span>{state.media.length} images</span>
              </div>
              <div className="media-grid">
                {state.media.map((m) => (
                  <article className="media-card" key={m.id}>
                    <img src={m.url} alt={m.name} />
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.width} × {m.height} · Image
                      </small>
                    </div>
                  </article>
                ))}
              </div>
              {!state.media.length && (
                <Empty
                  title="Your media library starts here"
                  text="Upload your first image, then add it to a playlist."
                />
              )}
            </>
          )}
          {tab === "Screens" && (
            <>
              <div className="stats">
                <div>
                  <span>Registered screens</span>
                  <strong>{state.screens.length}</strong>
                </div>
                <div>
                  <span>Assigned playlists</span>
                  <strong>
                    {state.screens.filter((s) => s.playlistId).length}
                  </strong>
                </div>
                <div>
                  <span>Available images</span>
                  <strong>{state.media.length}</strong>
                </div>
              </div>
              <section className="panel">
                <h2>Create a screen</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(async () => {
                      await api("/api/screens", json({ name: newName }));
                      setNewName("");
                    }, "Screen created. Assign a playlist and open its player.");
                  }}
                >
                  <input
                    aria-label="Screen name"
                    placeholder="e.g. Test TV"
                    required
                    maxLength={100}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <button disabled={busy}>＋ Create screen</button>
                </form>
              </section>
              <div className="section-label">
                YOUR SCREENS <span>Player links use a unique screen ID</span>
              </div>
              <div className="screen-grid">
                {state.screens.map((s) => (
                  <article className="screen-card" key={s.id}>
                    <div className="screen-icon">▣</div>
                    <div className="screen-heading">
                      <h2>{s.name}</h2>
                      <span className="pill">
                        {s.playlistId ? "Content assigned" : "Awaiting content"}
                      </span>
                    </div>
                    <label>
                      Assigned playlist
                      <select
                        aria-label={`Playlist for ${s.name}`}
                        disabled={busy}
                        value={s.playlistId ?? ""}
                        onChange={(e) =>
                          void action(async () => {
                            await api(
                              `/api/screens/${s.id}`,
                              json(
                                {
                                  name: s.name,
                                  playlistId: e.target.value || null,
                                },
                                "PUT",
                              ),
                            );
                          }, "Assignment saved. The player will update within 5 seconds.")
                        }
                      >
                        <option value="">No playlist · Fallback screen</option>
                        {state.playlists.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <a
                      className="button secondary"
                      href={`/player/${s.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open player ↗
                    </a>
                    <small>
                      Development link · Keep this URL on the display
                    </small>
                  </article>
                ))}
              </div>
              {!state.screens.length && (
                <Empty
                  title="Give your first display a name"
                  text="Create Test TV above to begin the demonstration."
                />
              )}
            </>
          )}
          {tab === "Playlists" && (
            <>
              <section className="panel">
                <h2>Create a playlist</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(async () => {
                      const p = await api<Playlist>(
                        "/api/playlists",
                        json({ name: newName }),
                      );
                      setDraft(p);
                      setDirty(false);
                      setNewName("");
                    }, "Playlist created. Add images below.");
                  }}
                >
                  <input
                    aria-label="Playlist name"
                    placeholder="e.g. Morning Announcements"
                    required
                    maxLength={100}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <button disabled={busy}>＋ Create playlist</button>
                </form>
              </section>
              <div className="playlist-layout">
                <div className="playlist-list">
                  {state.playlists.map((p) => (
                    <button
                      className={draft?.id === p.id ? "selected" : ""}
                      key={p.id}
                      onClick={() => {
                        if (
                          dirty &&
                          !confirm("Discard unsaved playlist changes?")
                        )
                          return;
                        setDraft(structuredClone(p));
                        setDirty(false);
                      }}
                    >
                      <strong>{p.name}</strong>
                      <span>
                        {p.items.length} images ·{" "}
                        {p.items.reduce((n, i) => n + i.duration, 0)} seconds
                      </span>
                    </button>
                  ))}
                </div>
                {draft ? (
                  <section className="panel editor">
                    <div className="editor-heading">
                      <h2>Edit playlist</h2>
                      <span className="pill">
                        {dirty ? "Unsaved changes" : "Saved"} · {totalSeconds}s
                      </span>
                    </div>
                    <label>
                      Playlist title
                      <input
                        aria-label="Edit playlist name"
                        maxLength={100}
                        value={draft.name}
                        onChange={(e) =>
                          change({ ...draft, name: e.target.value })
                        }
                      />
                    </label>
                    <div className="section-label">
                      PLAYBACK ORDER <span>Images default to 10 seconds</span>
                    </div>
                    {draft.items.map((item, i) => {
                      const m = state.media.find((m) => m.id === item.mediaId);
                      return (
                        <div className="playlist-item" key={i}>
                          <span className="order">{i + 1}</span>
                          <img src={m?.url} alt={m?.name} />
                          <div className="item-name">
                            {m?.name}
                            <label>
                              Seconds
                              <input
                                aria-label={`Duration for item ${i + 1}`}
                                type="number"
                                min={1}
                                max={3600}
                                value={item.duration}
                                onChange={(e) =>
                                  change({
                                    ...draft,
                                    items: draft.items.map((v, j) =>
                                      j === i
                                        ? {
                                            ...v,
                                            duration: Number(e.target.value),
                                          }
                                        : v,
                                    ),
                                  })
                                }
                              />
                            </label>
                          </div>
                          <div className="item-actions">
                            {[-1, 1].map((offset) => (
                              <button
                                className="icon-button"
                                key={offset}
                                aria-label={`${offset === -1 ? "Move up" : "Move down"} item ${i + 1}`}
                                disabled={
                                  i + offset < 0 ||
                                  i + offset >= draft.items.length
                                }
                                onClick={() => {
                                  const items = [...draft.items];
                                  [items[i], items[i + offset]] = [
                                    items[i + offset],
                                    items[i],
                                  ];
                                  change({ ...draft, items });
                                }}
                              >
                                {offset === -1 ? "↑" : "↓"}
                              </button>
                            ))}
                            <button
                              className="icon-button"
                              aria-label={`Remove item ${i + 1}`}
                              onClick={() =>
                                change({
                                  ...draft,
                                  items: draft.items.filter((_, j) => i !== j),
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {!draft.items.length && (
                      <p className="muted">
                        Add images from the library below to start this
                        playlist.
                      </p>
                    )}
                    <label>
                      Add an image
                      <select
                        aria-label="Add image"
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            change({
                              ...draft,
                              items: [
                                ...draft.items,
                                { mediaId: e.target.value, duration: 10 },
                              ],
                            });
                        }}
                      >
                        <option value="">
                          Choose from your media library…
                        </option>
                        {state.media.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="editor-footer">
                      <button
                        disabled={busy || !dirty}
                        onClick={() =>
                          void action(async () => {
                            const p = await api<Playlist>(
                              `/api/playlists/${draft.id}`,
                              json(draft, "PUT"),
                            );
                            setDraft(p);
                            setDirty(false);
                          }, "Playlist saved. Assigned players will update automatically.")
                        }
                      >
                        Save playlist
                      </button>
                      <a
                        className="button secondary"
                        href={`/preview/${draft.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview saved playlist ↗
                      </a>
                    </div>
                  </section>
                ) : (
                  <Empty
                    title="Build your announcement loop"
                    text="Create a playlist or select one to edit its images and timing."
                  />
                )}
              </div>
            </>
          )}
        </main>
        <footer>OpenSign · Built for your school community</footer>
      </div>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <span>▧</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
const match = location.pathname.match(/^\/(player|preview)\/([^/]+)$/);
createRoot(document.getElementById("root")!).render(
  match ? (
    <Player id={match[2]} preview={match[1] === "preview"} />
  ) : (
    <Dashboard />
  ),
);
