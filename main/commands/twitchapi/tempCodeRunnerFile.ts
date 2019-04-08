
const timeTypes: Array<{strings: string[], value: number}> = [
  {strings: ['y', 'yr', 'yrs', 'year', 'years'], value: 31536000000},
  /* {value: 1, strings: ['mon', 'month', 'months']}, */
  {strings: ['d', 'day', 'days'], value: 86400000},
  {strings: ['h', 'hr', 'hrs', 'hour', 'hours'], value: 3600000},
  {strings: ['m', 'min', 'mins', 'minute', 'minutes'], value: 60000},
  {strings: ['s', 'sec', 'secs', 'second', 'seconds'], value: 1000},
  {strings: ['ms', 'millisecond', 'milliseconds'], value: 1},
]
function parseTime(str: string): number {
  const split = str.replace(/\W/, '').toLowerCase().match(/[a-zA-Z]+|[0-9]+/g)
  if (!split) return 0
  let total = 0
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < split.length; i++) {
    if (!isNaN(+split[i + 1])) continue
    const num: number = +split[i]
    if (!isNaN(num)) continue
    const str: string = split[i + 1]
    const mult = getMultiplier(str)
    total += num * mult

    i++ // Skip time string
  }
  return total

  function getMultiplier(str: string): number {
    for (const v of timeTypes) {
      if (v.strings.includes(str)) return v.value
    }
    return 0
  }
}

console.log(parseTime('1h'))
