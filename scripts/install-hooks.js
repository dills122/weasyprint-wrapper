const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const gitDir = path.join(root, ".git");

function log(message) {
  process.stdout.write(`${message}\n`);
}

if (process.env.SKIP_HOOK_INSTALL === "1") {
  process.exit(0);
}

if (process.env.CI) {
  log("hooks: skip install in CI");
  process.exit(0);
}

if (!fs.existsSync(gitDir)) {
  log("hooks: skip install (no .git directory)");
  process.exit(0);
}

const result = spawnSync("npx", ["lefthook", "install"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  log("hooks: warning - lefthook install failed; continuing");
}
