import {
  chmod,
  copyFile,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import postject from "postject";

if (!["darwin", "linux"].includes(process.platform))
  throw new Error(
    "Build Mac releases on macOS; Linux builds are supported for verification.",
  );
const platform = process.platform === "darwin" ? "macos" : "linux";
const name = `OpenSign-${platform}-${process.arch}`;
const folder = path.resolve("release", name);
const executable = path.join(folder, "OpenSign");
await rm(folder, { recursive: true, force: true });
await mkdir(folder, { recursive: true });
await cp("dist", path.join(folder, "dist"), { recursive: true });
await cp(".release-build/server", path.join(folder, "server"), {
  recursive: true,
});
await writeFile(
  path.join(folder, "server/package.json"),
  '{"type":"commonjs"}\n',
);
for (const file of [
  "package.json",
  "package-lock.json",
  "README.md",
  "CHANGELOG.md",
])
  await copyFile(file, path.join(folder, file));
// Install native image libraries for the OS and CPU building this release.
execFileSync("npm", ["ci", "--omit=dev", "--prefix", folder], {
  stdio: "inherit",
});
await copyFile(process.execPath, executable);
await chmod(executable, 0o755);
const blob = path.resolve(".release-build/sea-prep.blob");
const config = path.resolve(".release-build/sea-config.json");
await writeFile(
  config,
  JSON.stringify({
    main: path.resolve("scripts/sea-entry.cjs"),
    output: blob,
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: false,
  }),
);
execFileSync(process.execPath, ["--experimental-sea-config", config], {
  stdio: "inherit",
});
if (process.platform === "darwin")
  execFileSync("codesign", ["--remove-signature", executable]);
await postject.inject(executable, "NODE_SEA_BLOB", await readFile(blob), {
  sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ...(process.platform === "darwin" ? { machoSegmentName: "NODE_SEA" } : {}),
});
if (process.platform === "darwin") {
  execFileSync("codesign", ["--sign", "-", executable]);
  execFileSync("codesign", ["--verify", executable]);
}
const launcher = path.join(
  folder,
  process.platform === "darwin"
    ? "Start OpenSign.command"
    : "start-opensign.sh",
);
await writeFile(
  launcher,
  '#!/bin/bash\nset -e\ncd -- "$(dirname -- "$0")"\nexec ./OpenSign\n',
);
await chmod(launcher, 0o755);
await copyFile("docs/DOWNLOAD.md", path.join(folder, "START-HERE.md"));
// Node's distribution license includes notices for bundled runtime components.
execFileSync(
  "curl",
  [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    `https://raw.githubusercontent.com/nodejs/node/v${process.versions.node}/LICENSE`,
    "--output",
    path.join(folder, "NODE-LICENSE.txt"),
  ],
  { stdio: "inherit" },
);
console.log(`Portable executable built: ${executable}`);
