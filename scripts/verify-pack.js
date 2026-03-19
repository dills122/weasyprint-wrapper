const { execFileSync } = require('child_process');
const os = require('os');
const path = require('path');

const expected = new Set([
  'LICENSE',
  'Readme.md',
  'dist/core.cjs',
  'dist/index.cjs',
  'dist/index.mjs',
  'index.js',
  'package.json',
]);

const cacheDir = path.join(os.tmpdir(), 'weasyprint-wrapper-npm-cache');

const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    npm_config_cache: cacheDir,
    npm_config_ignore_scripts: 'true',
    SKIP_HOOK_INSTALL: '1',
  },
});

const jsonStart = raw.indexOf('[');
if (jsonStart === -1) {
  throw new Error(`Unexpected npm pack output:\n${raw}`);
}

const parsed = JSON.parse(raw.slice(jsonStart));
if (!Array.isArray(parsed) || parsed.length === 0) {
  throw new Error('Unexpected npm pack JSON output');
}

const files = new Set((parsed[0].files || []).map((f) => f.path));
const unexpected = [...files].filter((f) => !expected.has(f));
const missing = [...expected].filter((f) => !files.has(f));

if (unexpected.length || missing.length) {
  const lines = [];

  if (missing.length) {
    lines.push(`Missing expected files: ${missing.sort().join(', ')}`);
  }

  if (unexpected.length) {
    lines.push(`Unexpected files in package: ${unexpected.sort().join(', ')}`);
  }

  throw new Error(lines.join('\n'));
}

process.stdout.write(`ok - package file set verified (${files.size} files)\n`);
