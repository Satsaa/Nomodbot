import * as fs from 'fs'
import { parse, resolve } from 'path'

// Used/read key files are stored outside the export
// This causes the cache to be the same object for each separate import
let cache: {[x: string]: any} = {}

/**
   * Return key value if it exists in JSON file in `path`  
   * Creates file in `path` and `keys` if needed. Created keys are set to null
   * @param path Path to file containing the wanted key
   * @param keys Path to a key.  
   * Like (file,`'foo','bar')` -> file.`foo.bar`
   * @Return Undefined if the key is created, otherwise the key's value
   */
export function getKey(path: string, ...keys: string[]): undefined | null | string {
  path = resolve(path)
  if (!cache.file) {
    const parsed = parse(path)
    fs.mkdirSync(parsed.dir, { recursive: true })
    if (!fs.existsSync(path)) {
      const tempPath = `${parsed.dir}/${parsed.name}_temp.${parsed.ext}`
      fs.writeFileSync(tempPath, '{}')
      fs.renameSync(tempPath, path)
    }
    cache[path] = JSON.parse(fs.readFileSync(path).toString())
  }

  let current = cache[path]
  let changed = false
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (i === keys.length - 1) {
      // last key
      if (typeof current[key] === 'undefined') {
        changed = true
        current[key] = null
      } else {
        if (changed) {
          const parsed = parse(path)
          const tempPath = `${parsed.dir}/${parsed.name}_temp.${parsed.ext}`
          fs.writeFileSync(tempPath, JSON.stringify(cache[path], null, 2))
          fs.renameSync(tempPath, path)
        }
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
  if (changed) {
    const parsed = parse(path)
    const tempPath = `${parsed.dir}/${parsed.name}_temp.${parsed.ext}`
    fs.writeFileSync(tempPath, JSON.stringify(cache[path], null, 2))
    fs.renameSync(tempPath, path)
  }
  return undefined
}

/**
   * Set key value in JSON file in `path`  
   * Creates file in `path` if needed
   * @param path Path to file containing the wanted key
   * @param keysAndVal Path to a key.  
   * Like (file,`'foo','bar','value')` -> file.`foo.bar = 'value'`
   * @Return Undefined if the key is created, otherwise the key's previous value
   */
export function setKey(path: string, ...keysAndVal: string[]): any {
  path = resolve(path)
  if (!cache.file) {
    const parsed = parse(path)
    fs.mkdirSync(parsed.dir, { recursive: true })
    if (!fs.existsSync(path)) {
      const tempPath = `${parsed.dir}/${parsed.name}_temp.${parsed.ext}`
      fs.writeFileSync(tempPath, '{}')
      fs.renameSync(tempPath, path)
    }
    cache[path] = JSON.parse(fs.readFileSync(path).toString())
  }

  const keys = keysAndVal.splice(0, keysAndVal.length - 1)
  const val = keysAndVal

  let current = cache[path]
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof current[keys[i]] !== 'object' || current[keys[i]] === null) current[keys[i]] = {}
    current = current[keys[i]]
  }

  const prevVal = current[keys[keys.length - 1]]
  current[keys[keys.length - 1]] = val

  const parsed = parse(path)
  const tempPath = `${parsed.dir}/${parsed.name}_temp.${parsed.ext}`
  fs.writeFileSync(tempPath, JSON.stringify(cache[path], null, 2))
  fs.renameSync(tempPath, path)
  return prevVal
}

/**
 * Empty the cache or part of it.
 * Files are cached in memory for efficiency.
 * @param path Path to file whose cache to delete
 */
export function delCache(path?: string) {
  if (path) cache[resolve(path)] = undefined
  else cache = {}
}
