var duplexify = require('duplexify')
var choppa = require('choppa')
var PassThrough = require('stream').PassThrough

module.exports = function rawStream (n) {
  var a = choppa(n)
  var b = choppa(n)

  return {
    a: duplexify(a, b),
    b: duplexify(b, a)
  }
}
