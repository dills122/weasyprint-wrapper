const spawn = require('child_process').spawn;
const slang = require('slang');

function quote(val) {
    // escape and quote the value if it is a string and this isn't windows
    if (typeof val === 'string' && process.platform !== 'win32') {
        val = '"' + val.replace(/(["\\$`])/g, '\\$1') + '"';
    }
    return val;
}

function weasyprint(input, options, callback) {
    if (!options) {
        options = {};
    } else if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var output = options.output;
    delete options.output;
    
    var keys = Object.keys(options);
    var args = [weasyprint.command];

    keys.forEach(function (key, index, arry) {
        arry[index] = key.length === 1 ? '-' + key : '--' + slang.dasherize(key);
    });

    const isUrl = /^(https?|file):\/\//.test(input);

    //if format is not specified and we are reading from stdin, than set default pdf format
    if (!output && !('f' in options) && !('format' in options)) {
        args.push('-f', 'pdf')
    }

    args.push(isUrl ? quote(input) : '-'); // stdin if HTML given directly
    args.push(output ? quote(output) : '-'); // stdout if no output file

    if (process.platform === 'win32') {
        var child = spawn(args[0], args.slice(1));
    } else {
        // this nasty business prevents piping problems on linux
        var child = spawn('/bin/sh', ['-c', args.join(' ') + ' | cat']);
    }

    // call the callback with null error when the process exits successfully
    if (callback) {
        child.on('exit', function () {
            callback(null);
        });
    }

    // write input to stdin if it isn't a url
    if (!isUrl) {
        child.stdin.end(input);
    }

    // return stdout stream so we can pipe
    return child.stdout
}

weasyprint.command = 'weasyprint';
module.exports = weasyprint;