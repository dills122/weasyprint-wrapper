const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const srcCore = path.join(root, "src", "core.js");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const coreSource = fs.readFileSync(srcCore, "utf8");
fs.writeFileSync(path.join(distDir, "core.cjs"), coreSource);

fs.writeFileSync(
  path.join(distDir, "index.cjs"),
  "const { spawn } = require('child_process');\nconst createWeasyprint = require('./core.cjs');\n\nmodule.exports = createWeasyprint(spawn);\n"
);

fs.writeFileSync(
  path.join(distDir, "index.mjs"),
  "import { spawn } from 'node:child_process';\nimport createWeasyprint from './core.cjs';\n\nconst weasyprint = createWeasyprint(spawn);\n\nexport default weasyprint;\n"
);
