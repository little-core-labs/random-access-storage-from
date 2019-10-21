random-access-storage-from
==========================

> Creates a [random-access-storage][ras] instance from a given input.

<a name="installation" /></a>
## Installation

```sh
$ npm install random-access-storage-from --save
```

<a name="usage" /></a>
## Usage

```js
const storage = from(input[, optsOrEncoding])
```

```js
const from = require('random-access-storage-from')

// get a 'random-access-memory' instance
const memory = from(Buffer.from('hello'))

// get a 'random-access-file' instance
const file = from('./path/to/file')

// get a 'random-access-http' instance
const http = from('https://example.com/example.txt')
```

<a name="api" /></a>
## API

The following section documents the API for the various expressions that
can be used with the `from(...)` function exported by this module. The
intent of the function is to return an object that is or is compatible
with a [random-access-storage][ras] interface based on certain types of
inputs like strings, *buffer-like** (`Buffer`, `ArrayBuffer` `Array`,
_JSON parsed `Buffer` objects_, etc) objects, and more.

The `from(...)` implementation uses a storage provider to provide
instances to the caller based on input. By default file based input
calls `providers.file()`, HTTP URL based input calls `providers.http()`,
and memory based input calls `providers.memory()`.

_See [Custom Providers](#custom-providers) for more information on
creating and handling custom input._

<a name="from-filename" /></a>
### `from(filename[, opts])`

Create a [random-access-storage][ras] instance from `filename` and
`opts` if `filename` points to a file. `opts` is passed directly to
the [`providers.file(filename, opts)`](#from-providers-file) function.
Callers should set `opts.file` to `true` to **create a new file** or if
the calling environment is in a web browser.

```js
const file = from('/path/to/file')
file.stat((err, stats) => {
  console.log(stats)
})
```

<a name="from-url" /></a>
### `from(url[, opts])`

Create a [random-access-storage][ras] instance from `url` and
`opts`.

If `url` points to a HTTP resource, `url` and `opts` are passed directly to
the [`providers.http(url, opts)`](#from-providers-http) function. Callers
should ensure correct [CORS][cors] headers are set if the calling
environment is in a web browser.

If `url` contains the `file:` protocol and the `pathame` points to a local
file, `pathname` and `opts` are passed directly to the
[`providers.file(url, opts)`](#from-providers-file) function.

```js
const file = from('https://example.com/example.txt')
file.read(0, 4, (err, buf) => {
  console.log(buf)
})
```

`file:` based URLs to read a local file

```js
const file = from('file:///home/user/example.txt')
file.read(0, 4, (err, buf) => {
  console.log(buf)
})
```

<a name="from-string" /></a>
### `from(string[, encoding = 'utf8'])`

Create a [random-access-storage][ras] instance from `string` and
optional `encoding`. The
[`providers.memory(buffer)`](#from-providers-memory) function is
called with `string` converted to a `Buffer` with `encoding`.

```js
const store = from('hello')
store.read(0, 5, (err, buf) => {
  console.log(buf) // 'hello'
})
```

Or with an encoding

```js
const store = from('68656c6c6f', 'hex')
store.read(0, 5, (err, buf) => {
  console.log(buf) // 'hello'
})
```

<a name="from-buffer" /></a>
### `from(buffer)`

Create a [random-access-storage][ras] instance from `buffer`.
The [`providers.memory(buffer)`](#from-providers-memory) function is
called with `buffer`.

```js
const store = from(Buffer.from('hello'))
store.read(0, 5, (err, buf) => {
  console.log(buf) // 'hello'
})
```

<a name="from-arraybuffer" /></a>
### `from(arrayBuffer[, opts])`

Create a [random-access-storage][ras] instance from `arrayBuffer` with
optional `opts` where `opts.byteOffset` indicates the byte offset in the
`arrayBuffer` and `opts.length` indicates the buffer length at
`opts.byteOffset`. `opts.byteOffset` and `opts.length` are passed
directly to
[`Buffer.from(arrayBuffer, byteOffset, length)`][buffer-from-arraybuffer].

```js
const crypto = require('crypto')

const bytes = crypto.randomBytes(64)
const shared = new SharedArrayBuffer(64)
const first = from(shared, { byteOffset: 0, length: 32)
const second = from(shared, { byteOffset: 32, length: 64)

// generate random bytes and copy into `shared`
bytes.copy(Buffer.from(shared))

first.read(0, 32, (err, buf) => {
  console.log(Buffer.compare(buf, bytes.slice(0, 32)))
})

second.read(0, 32, (err, buf) => {
  console.log(Buffer.compare(buf, bytes.slice(32, 64)))
})
```

<a name="from-factory-function" /></a>
### `from(factoryFunction[, opts])`

Create a [random-access-storage][ras] instance from `factoryFunction` with
optional `opts` where `factoryFunction` is called with `opts` who's
return value is immediately passed to the `from()` function with `opts`.

```js
const ras = require('random-access-storage')
const ram = require('random-access-memory')

const store = from(plugin(ram())

function plugin(proxy) {
  return (opts) => {
    return ras({
      open: (req) => proxy.open(req),
      read: (req) => proxy.read(req),
      write: (req) => proxy.write(req),
    })
  }
}
```

<a name="from-storage-interface" /></a>
### `from(storageInterface)`

Create a [random-access-storage][ras] instance from `storageInterface`
where `storageInterface` is passed directly to the
[random-access-storage][ras] factory function.

```js
const buffer = Buffer.alloc(32)
const store = from({
  stat(req) {
    req.callback(null, { size: buffer.length })
  },

  read(req) {
    req.callback(null, buffer.slice(req.offset, req.offset + req.size))
  },

  write(req) {
    req.data.copy(buffer, req.offset)
  }
})
```

<a name="from-storage-object" /></a>
### `from(storageObject)`

Returns `storageObject` if `storageObject` is a [random-access-storage][ras]
instance.

```js
const store = from(ram())
```

<a name="from-providers-" /></a>
### `from.providers`

Top level object that defines built-in and custom provider functions for
handling [file](#from-providers-file), [memory](#from-providers-memory),
[http](#from-providers-http), and [custom URL protocol
handlers)(#custom-providers).

Built-in providers, like [file](#from-providers-file),
[memory](#from-providers-memory), and [http](#from-providers-http) are
used based on the input given to the [`from()`](#api) function.

This section documents the providers and the modules they are based on.

_See [Custom Providers](#custom-providers) for more information on
creating and handling custom input._

<a name="from-providers-file" /></a>
### `from.providers.file`

This provider handles file based input when `from(...)` is called with
[`from(filename[, opts])`](#from-filename]) or
[`from(url[,opts])`](#from-url) where the protocol in `url` is `file:`.

This provider uses the [random-access-file][raf] module.

<a name="from-providers-http" /></a>
### `from.providers.http`

This provider handles file based input when `from(...)` is called with
[`from(url[,opts])`](#from-url) where the protocol in `url` is `http:`
or `https:`.

This provider uses the [random-access-http][rah] module.

<a name="from-providers-memory" /></a>
### `from.providers.memory`

This provider handles memory based input when `from(...)` is called with
[`from(string)`](#from-string), [`from(buffer)`](#from-buffer),
[`from(arrayBuffer)`](#from-arraybuffer)

This provider uses the [random-access-memory][ram] module.

<a name="from-providers-default" /></a>
### `from.providers.default`

This provider handles unknown or unhandled input and returns a default
[random-access-storage][ras] object.

`from.providers.default` is set to `from.providers.memory` by default,
but can be configured to be any other [random-access-storage][ras]
compliant object.

<a name="custom-providers" /></a>
## Custom Providers

A custom [`random-access-storage`][ras] provider implementation can be defined
and used by defining the provider factory function on the
`from.providers` object by `name` and using the `from(url[, opts])`
caller expression where the protocol in `url` matches the name defined
in `from.providers`

### Example

The example below implements [Data URIs][data-uris] (`data:`) as a
custom provider to handle the `data:` protocol given in a URL using the
[data-urls][data-urls] module to provide a `Buffer` to the
[random-access-memory][ram] factory function constructor.

```js
const parseDataURL = require('data-urls')
const from = require('random-access-storage-from')
const ram = require('random-access-memory')

from.providers.data = (uri, opts) => {
  const parsed = parseDataURL(uri)
  return ram(parsed.body)
}
```

Usage of the `data:` protocol can now be invoked from the `from(url[, opts])`
function.

```js
const from = require('random-access-storage-from')

const body = Buffer.from('hello')
const uri = `data:text/plain;base64,${body.toString('base64')}`

const data = from(uri)
data.read(0, body.length, (err, buf) => {
  console.log(buf) // 'hello'
})
```

## License

MIT


[raf]: https://github.com/random-access-storage/random-access-file
[rah]: https://github.com/random-access-storage/random-access-http
[ram]: https://github.com/random-access-storage/random-access-memory
[ras]: https://github.com/random-access-storage/random-access-storage
[cors]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
[data-urls]: https://github.com/jsdom/data-urls
[data-uris]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
[buffer-from-arraybuffer]: https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_arraybuffer_byteoffset_length
