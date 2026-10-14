// The executable loads the server beside it, so normal dependencies and native
// image codecs can be resolved without extracting code into temporary folders.
const { createRequire } = require("node:module");
const { dirname, join } = require("node:path");
const { homedir } = require("node:os");
const root = dirname(process.execPath);
process.chdir(root);
process.env.OPENSIGN_OPEN_BROWSER ??= "1";
if (process.platform === "darwin") {
  process.env.DATA_DIR ??= join(
    homedir(),
    "Library",
    "Application Support",
    "OpenSign",
  );
}
createRequire(join(root, "package.json"))("./server/index.js");
