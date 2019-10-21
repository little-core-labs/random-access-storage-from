const isBrowser = require('is-browser')
const from = require('./')

const uri = isBrowser ? 'index.html' : 'https://raw.githubusercontent.com/random-access-storage/random-access-storage/master/package.json'
const ram = from('hello')
const file = from(__filename)
const http = from(uri, { })

http.read(0, 4, console.log)
