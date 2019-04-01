
/**
 * Defines unexisting keys in `checkObj` that exist in `defaultObj`  
 * MUTATES `defaultObj`
 * @param defaultObj 
 * @param checkObj 
 */
export default (mutatedObj: object, defaultObj: object) => {

  defaults(mutatedObj, defaultObj)

  function defaults(checkObj: {[x: string]: any}, defaultObj: {[x: string]: any}) {

    for (const key in defaultObj) { // loop all keys
      if (isObject(defaultObj[key])) { // default key is object? Go deeper
        if (!checkObj.hasOwnProperty(key)) { // Key doesnt exist?
          checkObj[key] = Array.isArray(defaultObj[key]) ? [] : {} // Define as object type
          defaults(checkObj[key], defaultObj[key]) // Go deeper
        } else if (isObject(checkObj[key])
          && Array.isArray(defaultObj[key]) === Array.isArray(checkObj[key])) { // make sure both are same type of object
          defaults(checkObj[key], defaultObj[key]) // Go deeper
        } // continue if not same type of object
      } else { // default key is not object. Set default value
        if (!checkObj.hasOwnProperty(key)) { // Determine if the key exists
          checkObj[key] = defaultObj[key] // Set to default value
        }
      }
    }
  }
}

function isObject(v: any) {
  return v !== null && typeof v === 'object'
}
