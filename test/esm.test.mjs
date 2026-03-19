import assert from "node:assert";
import weasyprint from "../dist/index.mjs";

assert.strictEqual(typeof weasyprint, "function");
assert.ok(weasyprint._internals);
assert.strictEqual(typeof weasyprint._internals.buildArgsAndInput, "function");

process.stdout.write("ok - esm import smoke test\n");
