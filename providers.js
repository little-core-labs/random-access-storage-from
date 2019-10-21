const isBrowser = require('is-browser')

exports.memory = require('random-access-memory')
exports.http = require('random-access-http')

exports.file = isBrowser
  ? require('random-access-web')
  : require('random-access-file')


exports.default = exports.memory
