
module.exports.getRandomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min // The maximum is exclusive and the minimum is inclusive
}

module.exports.getRandomProperty = (obj) => {
  var keys = Object.keys(obj)
  return obj[keys[keys.length * Math.random() << 0]]
}
module.exports.getRandomKey = (obj) => {
  var keys = Object.keys(obj)
  return keys[keys.length * Math.random() << 0]
}

module.exports.RandomNormal = (min = 0, max = 100, skew = 1) => {
  return Math.pow(((Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random())) / 10.0 + 0.5), skew) * (max - min) + min
}

/** Converts ms to an array of time units
 * @param {number} ms Time to convert
 * @returns {array} [d, h, m, s]
 */
module.exports.MSToDHMS = MSToDHMS
function MSToDHMS (ms) {
  var d, h, m, s
  s = Math.floor(ms / 1000)
  m = Math.floor(s / 60)
  s = s % 60
  h = Math.floor(m / 60)
  m = m % 60
  d = Math.floor(h / 24)
  h = h % 24
  return [d, h, m, s]
}

/** Get string telling how long untill ms
 * @param {number} ms - Time to use
 * @param {number} top - How many time units to return
 * @param {boolean} short - To use short units (d or days)
 */
module.exports.timeUntill = (ms, top = 4, short = 1) => {
  let t = MSToDHMS(ms - Date.now()) // time
  return timeStr(t, top, short)
}

/** Get string telling how long untill ms
 * @param {number} ms - Time to use
 * @param {number} top - How many time units to return
 * @param {boolean} short - To use short units (d or days)
 */
module.exports.timeSince = (ms, top = 4, short = true) => {
  let t = MSToDHMS(Date.now() - ms) // time
  return timeStr(t, top, short)
}

/** Get string telling how long is ms
 * @param {array} t Time array [days,hours,minutes,seconds]
 * @param {number} top How many time units to return
 * @param {boolean} short Use short units (d or days)
 */
function timeStr (t, top, short) {
  let exists = 0
  let untill = []
  let dateStrLong = [' days', ' hours', ' minutes', ' seconds']
  let dateStrLongSing = [' day', ' hour', ' minute', ' second']
  let dateStrShort = ['d', 'h', 'm', 's']

  for (let i = 0; i < 4; i++) {
    if (t[i]) {
      exists++
      if (exists < top + 1) {
        if (short) untill[i] = t[i] + dateStrShort[i] // short
        else { // long with singular/plural
          if (t[i] === 1) untill[i] = t[i] + dateStrLongSing[i] // singular
          else untill[i] = t[i] + dateStrLong[i] // plural
        }
      } else untill[i] = ''
    }
  }
  return untill.join(' ')
}

/** Returns inputted singular or plural based on v's value
 * @param {any} v If this is 1 or '1' returns singular
 * @param {any} singular Singular form
 * @param {any} plural Plural form
 */
module.exports.plural = (v, singular, plural) => {
  return (v === 1 || v === '1' ? singular : plural)
}

/** Capitalizes a single character at pos
 * @param {string} string Input string
 * @param {number} pos What char to capitalize
 */
module.exports.cap = (string, pos = 0) => {
  return string.slice(0, pos) + string.charAt(pos).toUpperCase() + string.slice(pos + 1)
}
