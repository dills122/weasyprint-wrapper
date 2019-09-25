# Weasyprint Wrapper

A node wrapper module for use with the weasyprint cli

This module was a copy of this [repo](https://github.com/tdzienniak/node-weasyprint) with minor updates and reuploaded back to npm.


To install

```
npm i weasyprint-wrapper
```

Example use

```javascript
const weasyprint = require('weasyprint-wrapper');

//specify the location of weasyprint cli if not in PATH
weasyprint.command = '~/programs/weasyprint';

// URL
weasyprint('http://google.com/', { pageSize: 'letter' })
  .pipe(fs.createWriteStream('out.pdf'));
  
// HTML
weasyprint('<h1>Test</h1><p>Hello world</p>')
  .pipe(res);

// Stream input and output
var stream = weasyprint(fs.createReadStream('file.html'));

// output to a file directly
weasyprint('http://apple.com/', { output: 'out.pdf' });

// Optional callback
weasyprint('http://google.com/', { pageSize: 'letter' }, function (err, stream) {
  // do whatever with the stream
});
```
