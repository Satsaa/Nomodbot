
/**
 * Deeply clones `obj`
 */
export default (obj: object) => {

  const references: any[] = [] // Avoid circular reasoning

  return Array.isArray(obj) ? cloneArray(obj) : cloneObj(obj)

  function cloneObj(obj: {[x: string]: any}) {
    const returnVal: {[x: string]: any} = {}
    for (const key in obj) { // loop all keys
      const value = obj[key]
      if (isObject(value) && !references.includes(value)) {
        references.push(value)
        returnVal[key] = Array.isArray(value) ? cloneArray(obj[key]) : cloneObj(obj[key])
      } else {
        returnVal[key] = value
      }
    }
    return returnVal
  }

  function cloneArray(array: any[]) {
    const returnVal: any[] = []
    array.forEach((v, i) => {
      if (isObject(v) && !references.includes(v)) {
        references.push(v)
        returnVal[i] = Array.isArray(v) ? cloneArray(array[i]) : cloneObj(array[i])
      } else {
        returnVal[i] = v
      }
    })
    return returnVal
  }
}

function isObject(v: any) {
  return v !== null && typeof v === 'object'
}
