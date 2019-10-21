const providers = require('./providers')
const isBrowser = require('is-browser')
const assert = require('assert')
const debug = require('debug')('random-access-storage-from')
const url = require('url')
const ras = require('random-access-storage')
const fs = require('fs')

/**
 * Default encoding used when converting string inputs
 * into `Buffer` instances (`Buffer.from(input, encoding)`).
 * @public
 * @const
 */
const DEFAULT_ENCODING = 'utf8'

/**
 * Converts given `input` to a `RandomAccessStorage` instance.
 * Will convert URL string input to `random-access-file`,
 * and `random-access-http` instances if protocols are found or
 * input strings point to files on a file system.
 *
 * @public
 * @param {?(String|Buffer|Object|Function)} input
 * @param {?(String|Object)} optsOrEncoding
 * @return {RandomAccessStorage}
 */
function from(input, optsOrEncoding) {
  let opts = {}

  if ('string' === typeof optsOrEncoding) {
    opts = { encoding: optsOrEncoding }
  }

  if (null !== optsOrEncoding && 'object' === typeof optsOrEncoding) {
    opts = optsOrEncoding
  }

  if (!opts.encoding || 'string' !== typeof opts.encoding) {
    opts.encoding = DEFAULT_ENCODING
  }

  // String Input:
  // 1. Parse string as URL
  if ('string' === typeof input) {
    const { protocol, pathname } = url.parse(input)

    // 2. If `opts.file` is set to `true`
    //    a. Assume input is file, regardless of input format and return the
    //       value returned by `providers.file(input)` to the caller
    if (input.length && true === opts.file) {
      return providers.file(input, opts)
    }

    // 3. If string input contains a protocol
    if (protocol) {
      // a. Set `protocolName` to `protocol.slice(0, -1)`
      const protocolName = protocol.slice(0, -1)

      // b. If string matches /https?:/ protocol in parsed URL
      //    i. Return the value returned by `providers.http(input)` to
      //       the caller
      if (/https?:/.test(protocol)) {
        return providers.http(input, opts)
      }

      // c. If string matches /file:/ protocol in parsed URL
      //   i. Return the value returned by `providers.file(pathname)` to
      //      the caller
      if (/file:/.test(protocol)) {
        return providers.file(pathname)
      }

      // d. If protocol name exists in `providers` and exports a function
      //    i. Return the value returned by `providers[protocolName](input)`
      //       to the caller
      if (protocolName in providers) {
        if ('function' === typeof providers[protocolName]) {
          return providers[protocolName](input, opts)
        }
      }
    }

    // 4. If string points to a local file not running in browser
    //    a. Return the value returned by `providers.file(input)` to
    //       the caller
    if (!isBrowser) {
      try {
        fs.accessSync(input)
        if (fs.statSync(input).isFile()) {
          return providers.file(input)
        }
      } catch (err) {
        debug(err)
      }
    }

    // 5. If string input length is non-zero
    //    a. Return the value returned by `providers.memory(Buffer.from(input))`
    //       to the caller
    if (input.length > 0) {
      return providers.memory(Buffer.from(input, opts.encoding))
    }
  }

  // Number Input:
  // 1. If number input is >= `0`
  //    a. Return the value returned by `providers.memory(Buffer.alloc(input))`
  //       to the caller
  if (isNumber(input) && input >= 0) {
    return providers.memory(Buffer.alloc(input))
  }

  // Buffer(-like) Input:
  // 1. If input is "buffer-like" (Buffer, Array, ArrayBuffer, JSON-Buffer, etc)
  //    a. If input is an `ArrayBuffer`
  //       i. Return the value returned by
  //          `providers.memory(Buffer.from(input, opts.byteOffset, opts.length))`
  //           to the caller
  //    b. Return the value returned by `providers.memory(Buffer.from(input))`
  //       to the caller
  if (isBufferLike(input)) {
    if (input instanceof ArrayBuffer) {
      return providers.memory(Buffer.from(input, opts.byteOffset || 0, opts.length))
    } else {
      return providers.memory(Buffer.from(input, opts.encoding))
    }
  }

  // Object Input:
  // 1. If input is non `null` object
  //    a. If input is a "readable", "writable", "statable", or "deletable"
  //       i. Return `input` to caller
  //    b. Otherwise, return `RandomAccessStorage` instance with `input`
  //       passed directly to the constructor to caller
  if (null !== input && 'object' === typeof input) {
    const { readable, writable, statable, deletable } = input
    if (readable || writable || statable || deletable) {
      return input
    } else {
      return ras(input)
    }
  }

  // Function Input:
  // 1. If input is a function
  //    a. Call it with `opts`, and pass return value directly to `from()`
  if ('function' === typeof input) {
    return from(input(opts), opts)
  }

  // Default:
  // 1. Return the value returned by `provider.default(input, opts)`
  return providers.default(input, opts)
}

/**
 * The predicate function to determine if an input is
 * "buffer like", meaning the input object contains some
 * attributes that would make it suitable for converion into
 * a buffer with `Buffer.from(...)`.
 * @private
 * @param {Mixed} input
 * @return {Boolean}
 */
function isBufferLike(input) {
  if (Buffer.isBuffer(input)) {
    return true
  }

  if (input instanceof ArrayBuffer) {
    return true
  }

  if (null !== input && 'object' === typeof input) {
    if ('Buffer' === input.type && Array.isArray(input.data)) {
      return true
    }

    if (Array.isArray(input) && input.every(isNumber)) {
      return true
    }
  }

  return false
}

/**
 * Predicate function to determine if an input is a valid
 * number. Checks for `NaN` (`input === input`).
 * @private
 * @param {Mixed} input
 * @return {Boolean}
 */
function isNumber(input) {
  return 'number' === typeof input && input === input
}

/**
 * Module exporst.
 */
module.exports = Object.assign(from, {
  DEFAULT_ENCODING,
  providers
})
