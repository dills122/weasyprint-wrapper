const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const weasyprint = require("../dist/index.cjs");

const root = path.resolve(__dirname, "..");
const fixturePath = path.join(root, "fixtures", "smoke.html");
const outPath = path.join(root, "artifacts", "test-smoke.pdf");
const weasyprintBin = process.env.WEASYPRINT_BIN || "weasyprint";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertPdf(pathname) {
  const stat = fs.statSync(pathname);
  assert(stat.size > 500, `Expected non-trivial PDF size for ${pathname}, got ${stat.size} bytes`);

  const fd = fs.openSync(pathname, "r");
  const buf = Buffer.alloc(5);
  fs.readSync(fd, buf, 0, 5, 0);
  fs.closeSync(fd);

  assert(buf.toString("ascii") === "%PDF-", `Expected PDF header in ${pathname}`);
}

function run() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    weasyprint.command = weasyprintBin;

    const inputUrl = pathToFileURL(fixturePath).href;
    const out = fs.createWriteStream(outPath);

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
        assertPdf(outPath);
        process.stdout.write(`ok - wrote ${outPath}\n`);
        settle();
      } catch (err) {
        settle(err);
      }
    }

    const stream = weasyprint(inputUrl, {}, (err) => {
      callbackDone = true;
      callbackError = err || null;
      maybeFinish();
    });

    stream.on("error", settle);
    out.on("error", settle);

    out.on("finish", () => {
      outputDone = true;
      maybeFinish();
    });

    stream.pipe(out);
  });
}

run().catch((err) => {
  process.stderr.write(`smoke:pdf failed: ${err.message}\n`);
  process.exitCode = 1;
});
