function dasherize(input) {
  return input
    .replace(/\W+/g, "-")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function isReadableStream(value) {
  return !!value && typeof value.pipe === "function" && typeof value.on === "function";
}

function isUrl(value) {
  return typeof value === "string" && /^(https?|file):\/\//i.test(value.trim());
}

function getInputMode(input) {
  if (isUrl(input)) {
    return "url";
  }

  if (typeof input === "string" || Buffer.isBuffer(input)) {
    return "data";
  }

  if (isReadableStream(input)) {
    return "stream";
  }

  return "invalid";
}

function normalizeOptions(options) {
  if (!options) {
    return {};
  }

  return { ...options };
}

function buildOptionArgs(options) {
  const args = [];

  Object.keys(options).forEach((key) => {
    if (key === "output") {
      return;
    }

    const value = options[key];
    if (value === undefined || value === null || value === false) {
      return;
    }

    const flag = key.length === 1 ? `-${key}` : `--${dasherize(key)}`;

    if (value === true) {
      args.push(flag);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        args.push(flag, String(entry));
      });
      return;
    }

    args.push(flag, String(value));
  });

  return args;
}

function buildArgsAndInput(input, options) {
  const output = options.output;
  const optionArgs = buildOptionArgs(options);
  const inputMode = getInputMode(input);

  if (inputMode === "invalid") {
    throw new TypeError("input must be a URL string, HTML string, Buffer, or readable stream");
  }

  const inputArg = inputMode === "url" ? input.trim() : "-";
  const outputArg = output ? String(output) : "-";

  return {
    args: [...optionArgs, inputArg, outputArg],
    inputMode,
  };
}

function createExitError(code, signal, stderr) {
  const details = [];
  if (code !== null && code !== undefined) {
    details.push(`code ${code}`);
  }
  if (signal) {
    details.push(`signal ${signal}`);
  }

  const suffix = stderr && stderr.trim() ? `: ${stderr.trim()}` : "";
  const err = new Error(`weasyprint exited with ${details.join(", ")}${suffix}`);
  err.code = code;
  err.signal = signal;
  err.stderr = stderr;
  return err;
}

function createWeasyprint(defaultSpawn) {
  function weasyprint(input, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    const normalizedOptions = normalizeOptions(options);
    const { args, inputMode } = buildArgsAndInput(input, normalizedOptions);

    const spawnImpl = weasyprint._spawn || defaultSpawn;
    const child = spawnImpl(weasyprint.command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
        if (stderr.length > 4000) {
          stderr = stderr.slice(-4000);
        }
      });
    }

    let done = false;
    const finalize = (err) => {
      if (done || typeof callback !== "function") {
        return;
      }

      done = true;
      callback(err, child.stdout);
    };

    child.on("error", (err) => {
      finalize(err);
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        finalize(null);
        return;
      }

      finalize(createExitError(code, signal, stderr));
    });

    if (inputMode === "stream") {
      input.pipe(child.stdin);
    } else if (inputMode === "data") {
      child.stdin.end(input);
    } else {
      child.stdin.end();
    }

    return child.stdout;
  }

  weasyprint.command = "weasyprint";
  weasyprint._spawn = null;
  weasyprint._internals = {
    buildOptionArgs,
    buildArgsAndInput,
    getInputMode,
    isUrl,
  };

  return weasyprint;
}

module.exports = createWeasyprint;
