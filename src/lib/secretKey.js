const fs = require('fs')

// Used/read key files are stored here
var cache = {}

module.exports = {
  /**
   * Return key value if it exists in JSON `file`  
   * Creates `file` and the key if needed. Created keys are set to null
   * @param {string} file Path to file containing the wanted key
   * @param {...string} keys Path to a key.  
   * Like f(file,`'foo','bar')` -> file.`foo.bar`
   * @Return Undefined if the key is created, otherwise the key's value
   */
  getKey: (file, ...keys) => {
    if (!cache.file) {
      fs.mkdirSync(file.replace(/\/[^/]*$/, ''), { recursive: true })
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '{}')
        cache[file] = {}
      } cache[file] = JSON.parse(fs.readFileSync(file))
    }
    let current = cache[file]
    let changed = false
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
  },

  /**
   * Set key value in JSON `file`  
   * Creates `file` if needed
   * @param {string} file Path to file containing the wanted key
   * @param {...string} keysAndVal Path to a key.  
   * Like f(file,`'foo','bar','value')` -> file.`foo.bar = 'value'`
   * @Return Undefined if the key is created, otherwise the key's previous value
   */
  setKey: (file, ...keysAndVal) => {
    if (!cache.file) {
      fs.mkdirSync(file.replace(/\/[^/]*$/, ''), { recursive: true })
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '{}')
        cache[file] = {}
      } cache[file] = JSON.parse(fs.readFileSync(file))
    }
    var keys = keysAndVal.splice(0, keysAndVal.length - 1)
    var val = keysAndVal

    var current = cache[file]
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof current[keys[i]] !== 'object' || current[keys[i]] === null) current[keys[i]] = {}
      current = current[keys[i]]
    }
    var prevVal = current[keys[keys.length - 1]]
    current[keys[keys.length - 1]] = val

    console.log(keys, val, prevVal)
    console.log(cache[file])

    fs.writeFileSync(file, JSON.stringify(cache[file], null, 2))
  },

  /**
   * Files are cached in memory for efficiency
   * Delete cache or part of it
   * @param {string=} file Specific cache file to delete
   * @param {number=} schedule Schedule deletion
   */
  delCache: (file, schedule) => {
    if (schedule) {
      setTimeout(() => {
        if (file) cache[file] = undefined
        else cache = {}
      }, schedule)
    } else {
      if (file) cache[file] = undefined
      else cache = {}
    }
  }
}
