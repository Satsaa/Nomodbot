/**
 * Test if `obj` has all the keys of `matchObj`  
 * Considers arrays objects with indexes as keys [5,4,3] = {0:5,1:4,2:3}
 * @param {object | array} matchObj Object of required keys
 * @param {object | array} obj Test this object for required keys
 * @param {object} options
 * @param {boolean} options.matchValues Whether or not values are matched
 * @param {number} options.ignoreUndefined If a value in matchObj is undefined, the value is not matched when `matchValues` is used
 * @param {number} options.maxDepth Maximum depth checked. Deeper objects are ignored
 */
module.exports = (matchObj, obj, options = {}) => {
  var i = 0

  return testKeys(matchObj, obj)

  function testKeys (matchObj, obj) {
    if (typeof options.maxDepth === 'number') {
      i++
      if (i > options.maxDepth) return true
    }
    for (var key in matchObj) {
      var matchKey = matchObj[key]
      var objKey = obj[key]
      if (typeof objKey === 'undefined') return false // key didnt exist in obj
      // test that values match
      if (options.matchValues) {
        if (!(options.ignoreUndefined && matchKey === undefined)) {
          if (matchKey !== objKey) {
            if (typeof matchKey !== 'object' || typeof objKey !== 'object') {
              return false
            }
          }
        }
      }
      // test that keys exist
      if (typeof matchKey === 'object' && matchKey !== null) {
        if (typeof objKey !== 'object' && objKey !== null) {
          for (var k in matchKey) {
            return false
          }
        }
        if (!testKeys(matchKey, objKey)) return false
      }
    }
    return true
  }
}
