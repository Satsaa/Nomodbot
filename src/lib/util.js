
/** Returns a random integer betweent `min` and `max`
 * @param {number} min Minimum possible output
 * @param {number} max Maximum possible output
 */
function randomInt (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min // The maximum is exclusive and the minimum is inclusive
}
module.exports.randomInt = randomInt

/**
 * Returns first value that is not undefined
 * @param {...any} values
 */
function get (...values) {
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== undefined) return values[i]
  }
}
module.exports.get = get

/** Returns `singular` or `plural` based on `value`
 * @param {number | string} value If this is 1 or '1' `singular` is returned
 * @param {string} singular Singular form
 * @param {string} [plural] Plural form. Default is `singular` + 's'
 */
function plural (value, singular, plural) {
  return (value === 1 || value === '1' ? singular : get(plural, singular + 's'))
}
module.exports.plural = plural
