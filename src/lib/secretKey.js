const fs = require('fs')

// Used/read key files are stored here
var cache = {}

module.exports = {
  /**
   * Return key value if it exists in JSON `file`  
   * Creates `file` and the key if needed. Created keys are set to null
   * @param {string} file Path to file containing the wanted key
   * @param {string} keys Path to a key. Like `f(<path>,'foo','bar')` = `file`.foo.bar  
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
