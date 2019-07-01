import * as fs from 'fs'

// Used/read key files are stored here
let cache: {[x: string]: any} = {}

/**
   * Return key value if it exists in JSON `file`  
   * Creates `file` and `keys` if needed. Created keys are set to null
   * @param file Path to file containing the wanted key
   * @param keys Path to a key.  
   * Like (file,`'foo','bar')` -> file.`foo.bar`
   * @Return Undefined if the key is created, otherwise the key's value
   */
export function getKey(file: string, ...keys: string[]) {
  if (!cache.file) {
    fs.mkdirSync(file.replace(/\/[^/]*$/, ''), { recursive: true })
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '{}')
    }
    cache[file] = JSON.parse(fs.readFileSync(file).toString())
  }

  let current = cache[file],
      changed = false
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (i === keys.length - 1) {
      // last key
      if (typeof current[key] === 'undefined') {
        changed = true
        current[key] = null
      } else {
        if (changed) fs.writeFileSync(file, JSON.stringify(cache[file], null, 2))
        return current[key]
      }
    } else {
      if (typeof current[key] === 'undefined') {
        changed = true
        current[key] = {}
      } else if (typeof current[key] !== 'object') {
        break
      } // advance
      current = current[key]
    }
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(cache[file], null, 2))
  return undefined
}

/**
   * Set key value in JSON `file`  
   * Creates `file` if needed
   * @param file Path to file containing the wanted key
   * @param keysAndVal Path to a key.  
   * Like (file,`'foo','bar','value')` -> file.`foo.bar = 'value'`
   * @Return Undefined if the key is created, otherwise the key's previous value
   */
export function setKey(file: string, ...keysAndVal: string[]): any {
  if (!cache.file) {
    fs.mkdirSync(file.replace(/\/[^/]*$/, ''), { recursive: true })
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '{}')
    }
    cache[file] = JSON.parse(fs.readFileSync(file).toString())
  }

  const keys = keysAndVal.splice(0, keysAndVal.length - 1),
        val = keysAndVal

  let current = cache[file]
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof current[keys[i]] !== 'object' || current[keys[i]] === null) current[keys[i]] = {}
    current = current[keys[i]]
  }

  const prevVal = current[keys[keys.length - 1]]
  current[keys[keys.length - 1]] = val

  fs.writeFileSync(file, JSON.stringify(cache[file], null, 2))
  return prevVal
}

/**
   * Files are cached in memory for efficiency  
   * Empty the cache or part of it
   * @param file Specific cache file to delete
   */
export function delCache(file?: string) {
  if (file) cache[file] = undefined
  else cache = {}
}
