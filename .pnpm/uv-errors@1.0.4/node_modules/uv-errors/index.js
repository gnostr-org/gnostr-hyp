if (process.errnos || process.UV_ERRORS) {
  module.exports = process.errnos || process.UV_ERRORS
} else {
  module.exports = requireMap()
}

function requireMap () {
  try {
    const util = require('util')
    return util.getSystemErrorMap()
  } catch {
    return new Map()
  }
}
