# Weasyprint Wrapper

A Node.js wrapper around the `weasyprint` CLI.

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

## Usage

### CommonJS

```js
const fs = require('fs');
const weasyprint = require('weasyprint-wrapper');

weasyprint.command = '/usr/local/bin/weasyprint';

weasyprint('https://example.com', { pageSize: 'letter', mediaType: 'print' })
  .pipe(fs.createWriteStream('out.pdf'));
```

### ESM

```js
import fs from 'node:fs';
import weasyprint from 'weasyprint-wrapper';

weasyprint.command = '/usr/local/bin/weasyprint';

weasyprint('<h1>Test</h1><p>Hello world</p>')
  .pipe(fs.createWriteStream('out.pdf'));
```

### Input Types

- URL string
- HTML string
- `Buffer`
- readable stream

```js
const fs = require('fs');
const weasyprint = require('weasyprint-wrapper');

weasyprint(fs.createReadStream('file.html'))
  .pipe(fs.createWriteStream('out-from-stream.pdf'));

weasyprint('https://example.com', { output: 'out-direct.pdf' });

weasyprint('https://example.com', { pageSize: 'letter' }, (err, stream) => {
  if (err) {
    console.error(err);
    return;
  }

  stream.pipe(fs.createWriteStream('out-callback.pdf'));
});
```

## Real-World Smoke Test

Prerequisites:

- `weasyprint` installed locally
- any native dependencies required by your OS install of `weasyprint`

Run:

```bash
npm run test:real
```

If your binary is not on `PATH`:

```bash
WEASYPRINT_BIN=/absolute/path/to/weasyprint npm run test:real
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
