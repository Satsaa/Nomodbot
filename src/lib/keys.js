const fs = require('fs')

// Used/read key files are stored here
var cache = {}

module.exports = {
  /**
   * Return key value if it exists in file  
   * Creates the specified file and the key if needed
   * @param {string} file Path to file containing the key
   * @param {string} keys Path to a key. Like 'a', 'b' = fileObj.a.b 
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
        if (typeof current[key] === 'object') {
          break
        } else {
          if (!current[key]) {
            changed = true
            current[key] = null
          } else {
            if (changed) fs.writeFileSync(file, JSON.stringify(cache[file], null, 2))
            return current[key]
          }
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
  },

  /**
   * Delete cache or part of it
   * @param {string=} file Specific cache file to delete
   */
  delCache: (file) => {
    if (file) cache[file] = undefined
    else cache = {}
  }
}
