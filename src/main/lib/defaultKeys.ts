
/**
 * Defines unexisting keys in `checkObj` that exist in `defaultObj`  
 * MUTATES `defaultObj`  
 * Can handle circular references but ignores those values
 * @param defaultObj 
 * @param checkObj 
 */
export default <M extends object | any[], D extends M>(mutatedObj: M, defaultObj: Partial<D>) => {

  const references: any[] = [] // Avoid circular reasoning

  defaults(mutatedObj, defaultObj)

  function defaults(mutatedObj: {[x: string]: any}, defaultObj: {[x: string]: any}) {

    for (const key in defaultObj) { // loop all keys
      if (isObject(defaultObj[key])) { // default key is object? Go deeper
        if (!mutatedObj.hasOwnProperty(key) && !references.includes(defaultObj[key])) { // Key doesnt exist?
          mutatedObj[key] = Array.isArray(defaultObj[key]) ? [] : {} // Define as object type
          references.push(defaultObj[key]) // Circularity avoidance
          defaults(mutatedObj[key], defaultObj[key]) // Go deeper
        } else if (isObject(mutatedObj[key])
          && Array.isArray(defaultObj[key]) === Array.isArray(mutatedObj[key]) // make sure both are same type of object
          && !references.includes(defaultObj[key])) { // Circularity avoidance
          references.push(defaultObj[key])
          defaults(mutatedObj[key], defaultObj[key]) // Go deeper
        } // continue if not same type of object
      } else { // default key is not object. Set default value
        if (!mutatedObj.hasOwnProperty(key)) { // Determine if the key exists
          mutatedObj[key] = defaultObj[key] // Set to default value
        }
      }
    }
  }
}

function isObject(v: any) {
  return v !== null && typeof v === 'object'
}
