const parseDataURL = require('data-urls')
const isBrowser = require('is-browser')
const crypto = require('crypto')
const serve = require('serve-handler')
const test = require('tape')
const http = require('http')
const path = require('path')
const ram = require('random-access-memory')
const url = require('url')
const fs = require('fs')

const from = require('./')

test('from.providers', (t) => {
  t.ok('function' === typeof from.providers.memory)
  t.ok('function' === typeof from.providers.http)
  t.ok('function' === typeof from.providers.file)
  t.ok('function' === typeof from.providers.default)

  if (isBrowser) {
    t.equal(require('random-access-web'), from.providers.file)
  } else {
    t.equal(require('random-access-file'), from.providers.file)
  }

  // default for now
  t.equal(from.providers.default, from.providers.memory)
  t.end()
})

test('from(string) - File name', (t) => {
  const file = from(__filename)
  file.open((err) => {
    t.notOk(err)
    file.stat((err, stat) => {
      t.notOk(err)
      const { size } = fs.statSync(__filename)
      t.notOk(err)
      t.equal(size, stat.size)
      t.end()
    })
  })
})

test('from(string) - File protocol name', (t) => {
  const file = from('file://' + __filename)
  file.open((err) => {
    t.notOk(err)
    file.stat((err, stat) => {
      t.notOk(err)
      const { size } = fs.statSync(__filename)
      t.notOk(err)
      t.equal(size, stat.size)
      t.end()
    })
  })
})

test('from(string, opts) - Create file', (t) => {
  const expected = Buffer.from('hello')
  const filename = '_hello.txt'
  const file = from(filename, { file: true })
  file.write(0, expected, (err) => {
    t.notOk(err)
    t.ok(fs.statSync(filename))
    file.read(0, expected.length, (err, buf) => {
      t.notOk(err)
      t.ok(0 === Buffer.compare(buf, expected))
      t.end()
      fs.unlinkSync(filename)
    })
  })
})

test('from(string, opts) - HTTP file', (t) => {
  if (isBrowser) {
    t.skip()
    return t.end()
  }

  const server = http.createServer(serve)
  server.listen(0, (err) => {
    const { port } = server.address()
    t.notOk(err)
    const uri = `http://localhost:${port}/${path.basename(__filename)}`
    const file = from(uri)
    file.open((err) => {
      t.notOk(err)
      const { size } = fs.statSync(__filename)
      file.read(0, size, (err, buf) => {
        t.notOk(err)
        t.ok(0 === Buffer.compare(buf, fs.readFileSync(__filename)))
        t.end()
        server.close()
      })
    })
  })
})

test('from(string) - String memory', (t) => {
  const string = 'hello'
  const buffer = Buffer.from(string)
  const file = from(string)
  file.read(0, buffer.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(buffer, buf))
    t.end()
  })
})

test('from(string, encoding) - String memory with encoding', (t) => {
  const buffer = crypto.randomBytes(16)
  const string = buffer.toString('hex')
  const file = from(string, 'hex')
  file.read(0, buffer.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(buffer, buf))
    t.end()
  })
})

test('from(number) - Memory allocation', (t) => {
  const buffer = from(16)
  const expected = Buffer.alloc(16)
  buffer.read(0, buffer.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from(bufferLike) - Buffer', (t) => {
  const expected = Buffer.from('hello')
  const buffer = from(expected)
  buffer.read(0, expected.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from(bufferLike) - ArrayBuffer', (t) => {
  const expected = Buffer.from('hello')
  const buffer = from(expected.buffer, expected) // { byteOffset, length }
  buffer.read(0, expected.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from(bufferLike) - JSON Buffer', (t) => {
  const expected = Buffer.from('hello')
  const buffer = from(JSON.parse(JSON.stringify(expected)))
  buffer.read(0, expected.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from(bufferLike) - Array', (t) => {
  const expected = Buffer.from('hello')
  const buffer = from([ ...expected ])
  buffer.read(0, expected.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from(storageObject) - RandomAccessStorage instance', (t) => {
  const expected = Buffer.from('hello')
  const file = from(ram(expected))
  file.read(0, expected.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from(storageObject) - RandomAccessStorage interface', (t) => {
  const expected = Buffer.from('hello')
  const file = from({
    read(req) {
      req.callback(null, expected.slice(req.offset, req.offset + req.size))
    }
  })

  file.read(0, expected.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from(factoryFunction[, opts])', (t) => {
  const expected = Buffer.from('hello')
  const file = from((opts) => {
    t.equal(true, opts.value)
    return expected
  }, {
    value: true
  })

  file.read(0, expected.length, (err, buf) => {
    t.notOk(err)
    t.ok(0 === Buffer.compare(expected, buf))
    t.end()
  })
})

test('from()', (t) => {
  const buf = from()
  buf.read(0, 1, (err) => {
    t.ok(err)
    buf.write(0, Buffer.from('hello'), (err) => {
      t.notOk(err)
      buf.read(0, 5, (err, buffer) => {
        t.notOk(err)
        t.ok(0 === Buffer.compare(buffer, Buffer.from('hello')))
        t.end()
      })
    })
  })
})

test('from(string[, opts]) - Custom protocol (data:)', (t) => {
  const hello = Buffer.from('hello')
  const bytes = crypto.randomBytes(16)

  from.providers.data = (uri, opts) => {
    const parsed = parseDataURL(uri)
    return ram(parsed.body)
  }

  from(`data:,${encodeURIComponent(hello.toString())}`)
    .read(0, hello.length, (err, buf) => {
      t.notOk(err)
      t.ok(0 === Buffer.compare(buf, hello))

      from(`data:text/plain;base64,${bytes.toString('base64')}`)
        .read(0, bytes.length, (err, buf) => {
          t.notOk(err)
          t.ok(0 === Buffer.compare(buf, bytes))
          t.end()
        })
    })
})
