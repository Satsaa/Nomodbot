
export interface MatchKeysOptions {
  /** Keys that are undefined, won't be matched by value */
  ignoreUndefined?: boolean,
  /** Whether or not values are matched */
  matchValues?: boolean,
  /** Maximum depth checked. Deeper objects are ignored. Circular objects don't cause infinite loops regardless of this setting */
  maxDepth?: number
}

/**
 * Deeply tests if `haystackObj` has all the keys of `needleObj`  
 * Considers arrays objects with indexes as keys [5,4,3] = {0:5,1:4,2:3}
 * @param needleObj Object of required keys
 * @param haystackObj Test this object for required keys
 * @param options
 */
export default (haystackObj: Readonly<object>, needleObj: Readonly<object>, options: Readonly<MatchKeysOptions> = {}) => {

  if (typeof needleObj !== 'object' || typeof haystackObj !== 'object') return needleObj === haystackObj

  const references: any[] = [] // Avoid circular reasoning

  let i = 0

  return testKeys(needleObj, haystackObj, options)

  function testKeys(matchObj: Readonly<{[x: string]: any}>, obj: Readonly<{[x: string]: any}>, options: Readonly<MatchKeysOptions>) {
    if (typeof options.maxDepth === 'number') {
      i++
      if (i > options.maxDepth) return true
    }
    for (const key in matchObj) {
      const matchKey = matchObj[key]
      const objKey = obj[key]
      if (typeof objKey === 'undefined') return false // key didnt exist in obj
      // test that values match
      if ((options.matchValues)                                             // Test values if chosen
        && (!options.ignoreUndefined || matchKey !== undefined)             // Ignore undefined values if chosen
        && (matchKey !== objKey)                                            // Check if values don't match
        && (typeof matchKey !== 'object' || typeof objKey !== 'object')) {  // Check that both are not objects
        return false
      }
      // test that keys exist
      if (typeof matchKey === 'object' && matchKey !== null) {
        if (typeof objKey !== 'object' && objKey !== null) {
          for (const k in matchKey) {
            return false
          }
        }
        if (references.includes(matchKey)) return true // True?
        references.push(matchKey)
        if (!testKeys(matchKey, objKey, options)) return false
      }
    }
    return true
  }
}
