/**
 * Test if `obj` has all the keys of `matchObj`
 * @param {object} matchObj Object of required keys
 * @param {object} obj Test this object for required keys
 * @param {Object} options
 * @param {boolean} options.matchValues Whether or not values are matched
 * @param {number} options.maxDepth Return after object depth reaches this
 */
module.exports = (matchObj, obj, options = {}) => {
  var i = 0

  return testKeys(matchObj, obj)

  function testKeys (matchObj, obj) {
    if (typeof options.maxDepth === 'number') {
      i++
      if (i > options.maxDepth) return
    }
    for (var key in matchObj) {
      if (typeof obj[key] === 'undefined') return false // key didnt exist in obj
      // test that values match
      if (options.matchValues) {
        if (matchObj[key] !== obj[key]) {
          if (typeof matchObj[key] !== 'object' || typeof obj[key] !== 'object') {
            return false
          }
        }
      }
      // test that keys exist
      if (typeof matchObj[key] === 'object' && matchObj[key] !== null) {
        if (typeof obj[key] !== 'object' && obj[key] !== null) {
          for (var k in matchObj[key]) {
            return false
          }
        }
        if (!testKeys(matchObj[key], obj[key])) return false
      }
    }
    return true
  }
}
