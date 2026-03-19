const assert = require('assert');
const { EventEmitter } = require('events');
const { PassThrough, Writable, Readable } = require('stream');
const weasyprint = require('../index');

class CaptureWritable extends Writable {
  constructor() {
    super();
    this.chunks = [];
  }

  _write(chunk, _encoding, callback) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }

  toString() {
    return Buffer.concat(this.chunks).toString('utf8');
  }
}

function createMockChild() {
  const child = new EventEmitter();
  child.stdin = new CaptureWritable();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  return child;
}

async function run(name, fn) {
  try {
    await fn();
    process.stdout.write(`ok - ${name}\n`);
  } catch (err) {
    process.stderr.write(`not ok - ${name}\n${err.stack}\n`);
    process.exitCode = 1;
  }
}

(async () => {
  await run('builds option args correctly for html input', () => {
    const invocations = [];
    const child = createMockChild();

    weasyprint._spawn = (command, args) => {
      invocations.push({ command, args });
      return child;
    };

    weasyprint('<h1>Hi</h1>', { pageSize: 'letter', mediaType: 'print' });

    assert.strictEqual(invocations.length, 1);
    assert.strictEqual(invocations[0].command, 'weasyprint');
    assert.deepStrictEqual(
      invocations[0].args,
      ['--page-size', 'letter', '--media-type', 'print', '-', '-']
    );

    child.emit('close', 0);
  });

  await run('uses url directly and does not write to stdin', () => {
    const child = createMockChild();

    weasyprint._spawn = (_command, args) => {
      assert.deepStrictEqual(args, ['https://example.com', '-']);
      return child;
    };

    weasyprint('https://example.com');

    assert.strictEqual(child.stdin.toString(), '');
    child.emit('close', 0);
  });

  await run('pipes stream input into stdin', async () => {
    const child = createMockChild();

    weasyprint._spawn = (_command, _args) => child;

    const src = Readable.from(['<h1>', 'Hello', '</h1>']);
    weasyprint(src);

    await new Promise((resolve, reject) => {
      child.stdin.on('finish', resolve);
      child.stdin.on('error', reject);
    });

    assert.strictEqual(child.stdin.toString(), '<h1>Hello</h1>');
    child.emit('close', 0);
  });

  await run('returns callback error on non-zero exit', async () => {
    const child = createMockChild();

    weasyprint._spawn = () => child;

    const result = await new Promise((resolve) => {
      weasyprint('https://example.com', {}, (err) => {
        resolve(err);
      });

      child.stderr.write('bad flag');
      child.stderr.end();
      child.emit('close', 2);
    });

    assert.ok(result instanceof Error);
    assert.strictEqual(result.code, 2);
    assert.ok(result.message.includes('bad flag'));
  });

  await run('throws on unsupported stdin input', () => {
    let spawnCalled = false;
    const child = createMockChild();
    weasyprint._spawn = () => {
      spawnCalled = true;
      return child;
    };

    assert.throws(() => {
      weasyprint({ not: 'valid input' });
    }, /input must be a URL string/);
    assert.strictEqual(spawnCalled, false);
  });

  weasyprint._spawn = null;
})();
