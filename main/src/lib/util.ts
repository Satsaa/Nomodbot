
/**
 * Returns a random integer between `min` and `max`
 * @param min Minimum possible output
 * @param max Maximum possible output
 */
export function randomInt(min: number, max: number) { return Math.floor(Math.random() * (Math.floor(max + 1) - (min = Math.ceil(min)))) + min }

/**
 * Returns a random float between `min` and `max`
 * @param min Minimum possible output
 * @param max Maximum possible output
 */
export function randomFloat(min: number, max: number) { return (Math.random() * (max - min)) + min }

/**
 * Returns first value that is not undefined
 * @param `values`
 */
export function get(...values: any[]) { for (const key of values) { if (key !== undefined) return key } }

/**
 * Returns `singular` or `plural` based on `value`
 * @param v If this is 1 or '1' `singular` is returned
 * @param singular Singular form
 * @param plural Plural form. Defaults to `singular + 's'`
 */
export function plural(v: string | number, singular: string, plural?: string) { return (v === 1 || v === '1' ? singular : plural || singular + 's') }