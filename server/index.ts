import { createApp } from "./app.js";
const { app, db } = createApp(process.env.DATA_DIR ?? "data");
const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(`OpenSign: http://${process.env.HOST ?? "127.0.0.1"}:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
