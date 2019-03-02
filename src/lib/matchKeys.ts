
export interface MatchKeysOptions {
  /** Whether or not values are matched */
  matchValues?:boolean,
  /** If a value in matchObj is undefined, the value is not matched when `matchValues` is used */
  ignoreUndefined?:boolean,
  /** Maximum depth checked. Deeper objects are ignored */
  maxDepth?:number
}

/**
 * Test if `obj` has all the keys of `matchObj`  
 * Considers arrays objects with indexes as keys [5,4,3] = {0:5,1:4,2:3}
 * @param matchObj Object of required keys
 * @param obj Test this object for required keys
 * @param options
 */
export default (matchObj: {[x:string]:any}, obj: {[x: string]: any}, options?:MatchKeysOptions) => {
  if (typeof options === "undefined") options = {}
  let i = 0

  return testKeys(matchObj, obj, options)

  function testKeys (matchObj: {[x:string]:any}, obj: {[x:string]:any}, options: MatchKeysOptions) {
    if (typeof options.maxDepth === 'number') {
      i++
      if (i > options.maxDepth) return true
    }
    for (let key in matchObj) {
      let matchKey = matchObj[key]
      let objKey = obj[key]
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
          for (let k in matchKey) {
            return false
          }
        }
        if (!testKeys(matchKey, objKey, options)) return false
      }
    }
    return true
  }
}
