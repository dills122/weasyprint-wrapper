# Weasyprint Wrapper

[![CodeFactor](https://www.codefactor.io/repository/github/dills122/weasyprint-wrapper/badge)](https://www.codefactor.io/repository/github/dills122/weasyprint-wrapper)
[![CI](https://github.com/dills122/weasyprint-wrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/dills122/weasyprint-wrapper/actions/workflows/ci.yml)
[![WeasyPrint Smoke](https://github.com/dills122/weasyprint-wrapper/actions/workflows/weasyprint-smoke.yml/badge.svg)](https://github.com/dills122/weasyprint-wrapper/actions/workflows/weasyprint-smoke.yml)
[![npm version](https://img.shields.io/npm/v/weasyprint-wrapper.svg)](https://www.npmjs.com/package/weasyprint-wrapper)

A Node.js wrapper around the `weasyprint` CLI.

CI runs the real-world smoke test against multiple commonly used `weasyprint` releases: `52.5`, `53.3`, `57.2`, `60.2`, `61.2`, and `62.3`.

Main CI (`.github/workflows/ci.yml`) also runs a latest-unpinned `weasyprint` smoke test on push/PR.

A separate scheduled workflow (`.github/workflows/weasyprint-latest-nightly.yml`) runs weekly against the latest unpinned `weasyprint` release and can also be run manually from Actions.

## Install

```bash
npm i weasyprint-wrapper
```

`weasyprint` must already be installed and available in your `PATH`.

## Build

```bash
npm run build
```

Build output:

- `dist/index.cjs` for CommonJS (`require`)
- `dist/index.mjs` for ESM (`import`)

## Release

Release automation runs from `.github/workflows/release.yml` when a tag like `v1.0.0` is pushed.

What it does:

- validates tag matches `package.json` version
- runs quality gates (`npm run check`, `npm run pack:check`)
- publishes to npmjs (`NPM_TOKEN` secret required)
- creates a GitHub Release with generated release notes and attached npm tarball
- publishes to GitHub Packages only for scoped package names (automatically skipped for unscoped packages)

## Usage

### CommonJS

```js
const fs = require("fs");
const weasyprint = require("weasyprint-wrapper");

weasyprint.command = "/usr/local/bin/weasyprint";

weasyprint("https://example.com", { pageSize: "letter", mediaType: "print" }).pipe(
  fs.createWriteStream("out.pdf")
);
```

### ESM

```js
import fs from "node:fs";
import weasyprint from "weasyprint-wrapper";

weasyprint.command = "/usr/local/bin/weasyprint";

weasyprint("<h1>Test</h1><p>Hello world</p>").pipe(fs.createWriteStream("out.pdf"));
```

### Input Types

- URL string
- HTML string
- `Buffer`
- readable stream

```js
const fs = require("fs");
const weasyprint = require("weasyprint-wrapper");

weasyprint(fs.createReadStream("file.html")).pipe(fs.createWriteStream("out-from-stream.pdf"));

weasyprint("https://example.com", { output: "out-direct.pdf" });

weasyprint("https://example.com", { pageSize: "letter" }, (err, stream) => {
  if (err) {
    console.error(err);
    return;
  }

  stream.pipe(fs.createWriteStream("out-callback.pdf"));
});
```

## Real-World Smoke Test

Prerequisites:

- `weasyprint` installed locally
- any native dependencies required by your OS install of `weasyprint`

### macOS (Apple Silicon)

Install with Homebrew:

```bash
brew update
brew install weasyprint
weasyprint --version
which weasyprint
```

Expected binary path on Apple Silicon:

```bash
/opt/homebrew/bin/weasyprint
```

Run:

```bash
npm run test:real
```

### Local Docker Matrix (No Host Pollution)

Run the same multi-version smoke matrix locally in Docker:

```bash
npm run test:real:docker
```

Optional: pass explicit versions:

```bash
scripts/docker-smoke-matrix.sh 52.5 53.3 57.2 60.2 61.2 62.3
```

If your binary is not on `PATH`:

```bash
WEASYPRINT_BIN=/absolute/path/to/weasyprint npm run test:real
```

Example for Apple Silicon Homebrew:

```bash
WEASYPRINT_BIN=/opt/homebrew/bin/weasyprint npm run test:real
```

What it validates:

- CJS API with `file://` URL input
- CJS API with stream input
- ESM API with HTML string input
- generated outputs are real PDFs (`%PDF-` header and non-trivial file size)

## Options

Options are converted to CLI flags:

- single-char keys become short flags (`{ f: 'pdf' }` -> `-f pdf`)
- camelCase keys become kebab-case long flags (`{ pageSize: 'A4' }` -> `--page-size A4`)
- boolean `true` values are emitted as valueless flags (`{ presentationalHints: true }` -> `--presentational-hints`)
- array values repeat the same flag for each value

Special option:

- `output`: output file path (`-` is used by default for stdout)
