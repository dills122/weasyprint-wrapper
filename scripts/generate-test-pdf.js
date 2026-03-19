const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const weasyprint = require('../dist/index.cjs');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'fixtures', 'smoke.html');
const outPath = path.join(root, 'artifacts', 'test-smoke.pdf');
const weasyprintBin = process.env.WEASYPRINT_BIN || 'weasyprint';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

function run() {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  weasyprint.command = weasyprintBin;

  const inputUrl = pathToFileURL(fixturePath).href;

  const stream = weasyprint(inputUrl, {}, (err) => {
    if (err) {
      throw err;
    }
  });

  const out = fs.createWriteStream(outPath);

  stream.on('error', (err) => {
    process.stderr.write(`generate failed: ${err.message}\n`);
    process.exitCode = 1;
  });

  out.on('error', (err) => {
    process.stderr.write(`write failed: ${err.message}\n`);
    process.exitCode = 1;
  });

  out.on('finish', () => {
    try {
      assertPdf(outPath);
      process.stdout.write(`ok - wrote ${outPath}\n`);
    } catch (err) {
      process.stderr.write(`validation failed: ${err.message}\n`);
      process.exitCode = 1;
    }
  });

  stream.pipe(out);
}

run();
