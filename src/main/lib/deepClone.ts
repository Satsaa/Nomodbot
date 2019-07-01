
/**
 * Deeply clones `obj`  
 * Only own keys are cloned
 */
export default function <T extends object | any[]>(obj: T): T {
  const sourceRefs: any[] = [] // Avoid circular reasoning
  const outRefs: {[x: string]: any} = [] // Avoid circular reasoning

  // @ts-ignore // ez fix for return value
  return cloneObj(obj)

  function cloneObj(obj: {[x: string]: any}) {
    const returnVal: {[x: string]: any} = Array.isArray(obj) ? [] : {}

    sourceRefs.push(obj)
    outRefs.push(returnVal)

    for (const key in obj) {
      const value = obj[key]
      if (isObject(value)) {
        const index = sourceRefs.indexOf(value)
        returnVal[key] = index === -1 ? cloneObj(obj[key]) : returnVal[key] = outRefs[index]
      } else { returnVal[key] = value }
    }
    return returnVal
  }
}

function isObject(v: any) {
  return v !== null && typeof v === 'object'
}
