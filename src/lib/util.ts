
/** Returns a random integer betweent `min` and `max`
 * @param min Minimum possible output
 * @param max Maximum possible output
 */
export function randomInt (min: number, max: number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min // The maximum is exclusive and the minimum is inclusive
}

/**
 * Returns first value that is not undefined
 * @param values
 */
export function get (...values: any[]) {
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== undefined) return values[i]
  }
}

/** Returns `singular` or `plural` based on `value`
 * @param value If this is 1 or '1' `singular` is returned
 * @param singular Singular form
 * @param plural Plural form. Default is `singular` + 's'
 */
export function plural (value: string | number, singular: string, plural?: string) {
  return (value === 1 || value === '1' ? singular : get(plural, singular + 's'))
}
