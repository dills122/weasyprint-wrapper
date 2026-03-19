const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const weasyprintCjs = require('../dist/index.cjs');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'fixtures', 'smoke.html');
const weasyprintBin = process.env.WEASYPRINT_BIN || 'weasyprint';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureCommandAvailable() {
  const probe = spawnSync(weasyprintBin, ['--version'], { encoding: 'utf8' });

  if (probe.error || probe.status !== 0) {
    const reason = probe.error
      ? probe.error.message
      : (probe.stderr || probe.stdout || 'unknown error').trim();
    throw new Error(
      `Cannot execute weasyprint binary '${weasyprintBin}'. Set WEASYPRINT_BIN if needed. Details: ${reason}`
    );
  }

  process.stdout.write(`using weasyprint: ${(probe.stdout || '').trim()}\n`);
}

function assertPdf(pathname) {
  const stat = fs.statSync(pathname);
  assert(stat.size > 500, `Expected non-trivial PDF size for ${pathname}, got ${stat.size} bytes`);

  const fd = fs.openSync(pathname, 'r');
  const buf = Buffer.alloc(5);
  fs.readSync(fd, buf, 0, 5, 0);
  fs.closeSync(fd);

  assert(buf.toString('ascii') === '%PDF-', `Expected PDF header in ${pathname}`);
}

function runConversion(api, input, outputPath, label) {
  return new Promise((resolve, reject) => {
    let callbackDone = false;
    let callbackError = null;
    let outputDone = false;
    let settled = false;

    function settle(err) {
      if (settled) {
        return;
      }
      settled = true;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    }

    function maybeFinish() {
      if (!callbackDone || !outputDone) {
        return;
      }

      if (callbackError) {
        settle(callbackError);
        return;
      }

      try {
        assertPdf(outputPath);
        process.stdout.write(`ok - ${label}\n`);
        settle();
      } catch (err) {
        settle(err);
      }
    }

    const out = fs.createWriteStream(outputPath);
    const stream = api(input, {}, (err) => {
      callbackDone = true;
      callbackError = err || null;
      maybeFinish();
    });

    stream.on('error', settle);
    out.on('error', settle);

    out.on('finish', () => {
      outputDone = true;
      maybeFinish();
    });

    stream.pipe(out);
  });
}

async function main() {
  ensureCommandAvailable();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weasyprint-wrapper-'));
  const html = fs.readFileSync(fixturePath, 'utf8');
  const urlInput = pathToFileURL(fixturePath).href;

  weasyprintCjs.command = weasyprintBin;
  await runConversion(weasyprintCjs, urlInput, path.join(tmpDir, 'cjs-url.pdf'), 'cjs url input');

  const streamInput = fs.createReadStream(fixturePath);
  await runConversion(
    weasyprintCjs,
    streamInput,
    path.join(tmpDir, 'cjs-stream.pdf'),
    'cjs stream input'
  );

  const esmModule = await import(pathToFileURL(path.join(root, 'dist', 'index.mjs')).href);
  const weasyprintEsm = esmModule.default;
  weasyprintEsm.command = weasyprintBin;
  await runConversion(weasyprintEsm, html, path.join(tmpDir, 'esm-html.pdf'), 'esm html input');

  process.stdout.write(`smoke artifacts: ${tmpDir}\n`);
}

main().catch((err) => {
  process.stderr.write(`smoke test failed: ${err.message}\n`);
  process.exitCode = 1;
});
