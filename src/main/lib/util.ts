import { promises as fsp } from 'fs'
import * as path from 'path'

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
 * Returns a random normalized number between min and max
 * @param min Minimum possible output
 * @param max Maximum possible output
 * @param skew Skews the normal mean closer to min (>1) or max (<1). I don't know
 */
export function randomNormal(min = 0, max = 100, skew = 1) {
  return Math.pow(((Math.sqrt(Math.log(Math.random()) * -2.0) * Math.cos(Math.PI * Math.random() * 2.0)) / 10.0 + 0.5), skew) * (max - min) + min
}

/**
 * Returns first value that is not undefined
 * @param `values`
 */
export function get(...values: any[]) { for (const key of values) { if (key !== undefined) return key } }

/** Capitalizes the character at `pos` */
export function cap(str: string, pos = 0) { return str.slice(0, pos) + str.charAt(pos).toUpperCase() + str.slice(pos + 1) }

/** Adds '.' at the end of the string if it doesnt have it already. Ignores trailing whitespace */
export function endPunctuate(str: string) {
  const pos = str.search(/\s*$/) // Start index of whitespace
  if (str.charAt(pos - 1) === '.') return str
  else return insert(str, pos, '.')
}

/**
 * Returns a random key value of an object
 */
export function getRandomKeyValue(obj: {[x: string]: any}) {
  const keys = Object.keys(obj)
  return obj[keys[keys.length * Math.random() << 0]]
}

/**
 * Returns a random key name of an object
 */
export function getRandomKey(obj: {[x: string]: any}) {
  const keys = Object.keys(obj)
  return keys[keys.length * Math.random() << 0]
}

/**
 * Determines whether `obj1` contains a reference value that `obj2` also contains
 */
export function containsSharedReference(obj1: object, obj2: object) {
  const obj1Refs: any[] = [obj1]
  const obj2Refs: any[] = [obj2]
  obj1RefFill(obj1)
  obj2RefFill(obj2)
  for (const ref of obj1Refs) if (obj2Refs.includes(ref)) return true
  return false

  function obj1RefFill(obj1: {[x: string]: any}) {
    for (const key in obj1) {
      if (isObject(obj1[key]) && !obj1Refs.includes(obj1[key])) {
        obj1Refs.push(obj1[key])
        obj1RefFill(obj1[key])
      }}}
  function obj2RefFill(obj2: {[x: string]: any}) {
    for (const key in obj2) {
      if (isObject(obj2[key]) && !obj2Refs.includes(obj2[key])) {
        obj2Refs.push(obj2[key])
        obj2RefFill(obj2[key])
      }}}
  function isObject(v: any) {
    return v !== null && typeof v === 'object'
  }
}

/**
 * Human compatible indexes  
 * Converts 1 based indexes to 0 based indexes and limits the result to be within 0-max  
 * Allows using negative indexes to get -nth last indexes
 * @param index Input index
 * @param max Maximum index. Can also use an array for max index
 */
export function smartIndex(index: number, max: number | any[] = Infinity) {
  if (typeof max !== 'number') max = max.length
  if (index < 0) {
    if (index < -max) return 0
    return max + index // 100 -1 + 1
  }
  if (index < 1) return 0
  if (index > max) return max - 1
  return index - 1
}

/**
 * Removes strictly equal duplicates from `array`
 * @param array Target array
 * @param table You are being forced to enable this for known string or number arrays
 */
export function uniquify<T extends any[]>(array: T, table: T extends (number[] | string[]) ? true : false): T {
  const result: any[] = []
  if (table) {
    const seen: {[x: string]: true} = {}

    for (const element of array) {
      if (!seen[element]) result.push(element) // Big -> small
      else seen[element] = true
    }
  } else {
    const seen: any[] = []

    for (const element of array) {
      if (!seen.includes(element)) result.push(element)
      seen.push(element)
    }
  }
  return result as T
}

/**
 * Converts `ms` to an array of time units
 * @param ms Time in milliseconds
 * @returns [`days`,`hours`,`minutes`,`seconds`]
 */
export function MSToDHMS(ms: number) {
  let d; let h; let m; let s
  s = Math.floor(ms / 1000)
  m = Math.floor(s / 60)
  s = s % 60
  h = Math.floor(m / 60)
  m = m % 60
  d = Math.floor(h / 24)
  h = h % 24
  return [d, h, m, s]
}

/**
 * Get string telling how long until time is `ms`
 * @param ms Time in milliseconds
 * @param top How many time units to return
 * @param long Use long units (d or days)
 */
export function timeUntil(ms: number, top = 4, long = false) { return timeDuration(MSToDHMS(ms - Date.now()), top, long) }

/**
 * Get string telling how long since time was `ms`
 * @param ms Time in milliseconds
 * @param top How many time units to return
 * @param long Use long units (d or days)
 */
export function timeSince(ms: number, top = 4, long = false) { return timeDuration(MSToDHMS(Date.now() - ms), top, long) }

/**
 * Get string telling how long is ms
 * @param t Time in milliseconds or time array [days,hours,minutes,seconds]
 * @param top How many time units to return
 * @param long Use long units (d or days)
 */
export function timeDuration(t: number | number[], top = 4, long = false) {
  let exists = 0
  const untill = []
  const dateStrLong = [' day', ' hour', ' minute', ' second']
  const dateStrShort = ['d', 'h', 'm', 's']

  if (typeof t === 'number') {
    t = MSToDHMS(t) // make to an array
  }

  for (let i = 0; i < 4; i++) {
    if (t[i]) {
      exists++
      if (exists < top + 1) {
        if (!long) untill[i] = t[i] + dateStrShort[i] // short
        else { // long with singular/plural
          if (t[i] === 1) untill[i] = t[i] + dateStrLong[i] // singular
          else untill[i] = t[i] + dateStrLong[i] + 's' // plural
        }
      }
    }
  }
  const str = untill.join(' ').trim()
  if (str === '') {
    return long ? '0 seconds' : '0s'
  }
  return str
}

const parseTimeTypes: Array<{strings: string[], value: number}> = [
  {strings: ['y', 'yr', 'yrs', 'year', 'years'], value: 31536000000},
  {strings: ['d', 'day', 'days'], value: 86400000},
  {strings: ['h', 'hr', 'hrs', 'hour', 'hours'], value: 3600000},
  {strings: ['m', 'min', 'mins', 'minute', 'minutes'], value: 60000},
  {strings: ['s', 'sec', 'secs', 'second', 'seconds'], value: 1000},
  {strings: ['ms', 'millisecond', 'milliseconds'], value: 1},
  {strings: ['ns', 'nanosecond', 'nanoseconds'], value: 1},
]
/**
 * Converts strings like 5days600min99ms to time in milliseconds  
 * The order or case of time units doesn't matter.
 * Most important thing is that the time unit strings are typical.
 * Any non numeric or alphabetic characters are removed
 */
export function parseTimeStr(str: string): number {
  const split = str.replace(/\W/, '').toLowerCase().match(/[a-zA-Z]+|[0-9]+/g)
  if (!split) return 0
  let total = 0
  for (let i = 0; i < split.length; i++) {
    if (!isNaN(+split[i + 1])) continue
    const num: number = +split[i]
    if (isNaN(num)) continue
    total += getMultiplier(split[i + 1]) * num
    i++ // Skip time string
  }
  return total

  function getMultiplier(str: string): number { // Gets the ms multiplier for time units ('sec' = 1000)
    for (const v of parseTimeTypes) if (v.strings.includes(str)) return v.value
    return 0
  }
}

/**
 * Returns time converted to YYYY-MM-DD, the only logical format
 * @param ms Time in milliseconds
 * @param separator String to put between time units
 */
export function dateString(ms: number, separator = '-') {
  let dateStr = new Date(ms).toISOString()
  dateStr = dateStr.substring(0, dateStr.indexOf('T'))
  if (separator) return dateStr.replace(/=/gi, separator)
  else return dateStr
}

/**
 * Insert to a string at pos
 * @param str String to insert into
 * @param index Insert position
 * @param insert Insert string
 */
export function insert(str: string, index: number, insert: string) { return str.substr(0, index) + insert + str.substr(index) }

/**
 * Returns `value` `singular` or `value` `plural` based on `value`
 * @param v If this is 1 or '1' `singular` is returned
 * @param singular Singular form
 * @param plural Plural form. Defaults to `singular + 's'`
 * @param noValue `value` wont be returned with the result
 */
export function plural(v: string | number, singular: string, plural?: string, noValue?: boolean): string
export function plural(v: string | number, singular: string, noValue?: boolean, plural?: string): string
export function plural(v: string | number, singular: string, plural?: string | boolean, noValue: boolean | string = false) {
  if (typeof plural === 'boolean') {
    const old = noValue
    noValue = plural
    plural = old
  }
  if (noValue) return (v === 1 || v === '1' ? `${singular}` : `${plural || singular + 's'}`)
  return (v === 1 || v === '1' ? `${v} ${singular}` : `${v} ${plural || singular + 's'}`)
}

const onExitCbs: Array<(code: number) => void> = []
const signals = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGILL', 'SIGUSR1', 'SIGUSR2', 'SIGQUIT']
const throwSignals = ['uncaughtException']
const onExitFunc = (code: number) => {
  onExitCbs.forEach(cb => cb(code))
  signals.forEach((signal: any) => process.removeListener(signal, onExitFunc))
  process.exit(code)
}
const throwOnExitFunc = (error: Error) => {
  onExitCbs.forEach(cb => cb(1))
  signals.forEach((signal: any) => process.removeListener(signal, onExitFunc))
  throw error
}
signals.forEach((signal: any) => process.on(signal, onExitFunc))
throwSignals.forEach((signal: any) => process.on(signal, throwOnExitFunc))
/**
 * Attempts to excecute `cb` when the script is exiting.  
 * Does process.exit(code) after callbacks are finished
 * @param cb Synchronous callback
 */
export function onExit(cb: (code: number) => void) { onExitCbs.push(cb) }

/** Checks if `obj` has the key chain `...keys` */
export function validChain(obj: {[x: string]: any}, ...keys: string[]) { return keys.reduce((p, c) => (p || {})[c], obj) !== undefined }

/**
 * Finds all files in `dir` and its subfolders recursively  
 * File paths may not converted by the Typescript compiler so use the __module variable to build dynamic file paths
 * @param dir A directory path
 */
export async function readDirRecursive(dir: string, allFiles: string[] = []) {
  const files = (await fsp.readdir(dir)).map(file => path.resolve(dir, file))
  allFiles.push(...files)
  await Promise.all(files.map(async file => (
    (await fsp.stat(file)).isDirectory() && readDirRecursive(file, allFiles)
  )))
  return allFiles
}

/**
 * Promise setTimeout
 * @param ms Wait duration
 */
export function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

export interface FitStringOptions {
  /** Fitting length */
  maxLength: number,
  /** Truncated strings are ended with '...' by default */
  ender?: string,
  /** Strings are separated by this. Defaults to no separator */
  separator?: string,
}
/**
 * Combines strings in a way that it fits in `length` and truncates strings based on their priority
 * @param options Fitting length or options
 * @param strings [string, priority] The higher the number the higher priority
 */
export function fitStrings(options: number | FitStringOptions, ...strings: Array<[string, number]>): string {
  const opts: Required<FitStringOptions> = {
    maxLength: 500,
    ender: '...',
    separator: ' ',
    ...(typeof options === 'object' ? options : {maxLength: options}),
  }
  const maxLength = opts.maxLength + opts.separator.length

  const byPriority = [...strings].sort((a, b) => b[1] - a[1])
  const message = []
  let remaining = maxLength - opts.separator.length
  for (const pair of byPriority) {
    if (remaining < 0) break
    const final = end(opts.ender, pair[0].slice(0, remaining), pair[0].length)
    if (final.length) {
      message[strings.indexOf(pair)] = final
      remaining -= final.length + opts.separator.length
    }
  }

  return message.filter(v => v).join(opts.separator)

  function end(ender: string, str: string, preLength: number) {
    if (preLength === str.length) return str
    if (str.length <= ender.length) return ''
    return fixInvalid(str.slice(0, str.length - ender.length) + ender)
  }
  function fixInvalid(str: string) {
    if (str.charCodeAt(str.length - 4) === 55349) return str.slice(0, str.length - 4) + str.slice(str.length - 3)
    return str
  }
}

/**
 * Add proper punctuation between `words` (Peter, Jones and Malfoy)
 * @param words Words array to punctuate between
 * @param comma String between all but the two last words
 * @param and String between two last words
 */
export function commaPunctuate(words: string[], comma = ', ', and = ' and ') {
  let result = ''
  words.forEach((word, i) => {
    word = word.trim()
    if (words.length - i === 2) {
      result += word + and
    } else if (words.length - i > 2) {
      result += word + comma
    } else {
      result += word
    }
  })
  return result
}

const addArticleVowels = ['a', 'e', 'i', 'o', 'u', 'y', '8']
/**
 * Adds the appropriate article (a or an) to the word  
 * "Eleven" in numeric form is not supported
 * @param word Check article against this
 */
export function addArticle(word: string) {
  word = word.trimLeft()
  if (addArticleVowels.includes(word.charAt(0).toLowerCase()) && !word.startsWith('uni') && !word.startsWith('one')) return 'an ' + word
  return 'a ' + word
}

/**
 * Add ordinal of an integer (st,nd,rd,th) to the integer and returns it as a string
 * @param i Check ordinal against this
 */
export function addOrdinal(i: number, ordinalOnly = false) {
  const j = i % 10
  const k = i % 100
  if (j === 1 && k !== 11) {
    return ordinalOnly ? '' : i + 'st'
  }
  if (j === 2 && k !== 12) {
    return ordinalOnly ? '' : i + 'nd'
  }
  if (j === 3 && k !== 13) {
    return ordinalOnly ? '' : i + 'rd'
  }
  return ordinalOnly ? '' : i + 'th'
}
/**
 * Converts bytes to a more readable format
 * @param bytes Bytes to convert
 * @param decimals Maximum outputted decimal places
 */
export function formatBytes(bytes: number, decimals = 0) {
  if (bytes === 0) return '0 Bytes'
  if (bytes === 1) return '1 Byte'
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals)) + ' ' + sizes[i]
}

const fontifyAlpha = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890<>(){}[]&#%/,.:;_-+|?!'"'*=`
const fontifyStyles = {
  // tslint:disable: max-line-length
  circled: Array.from('ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ①②③④⑤⑥⑦⑧⑨⓪⧀⧁(){}[]&#%⊘,⨀:;_⊖⊕⦶?!\'"\'⊛⊜]'),
  circledNeg: Array.from('🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩❶❷❸❹❺❻❼❽❾⓿<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  fullwidth: Array.from('ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ１２３４５６７８９０<>（）｛｝［］＆＃％／，．：；＿－＋｜？！\'"＇＊＝]'),
  mathBold: Array.from('𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗𝟎<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathBoldFraktur: Array.from('𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathBoldItalic: Array.from('𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathBoldScript: Array.from('𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathDoubleStruck: Array.from('𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡𝟘<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathMonospace: Array.from('𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿𝟶<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathSans: Array.from('𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫𝟢<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathSansBold: Array.from('𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵𝟬<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathSansBoldItalic: Array.from('𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  mathSansItalic: Array.from('𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  parenthesized: Array.from('⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵⑴⑵⑶⑷⑸⑹⑺⑻⑼0<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  squared: Array.from('🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉1234567890<>(){}[]&#%⧄,⊡:;_⊟⊞|?!\'"\'⧆=]'),
  // tslint:enable: max-line-length
}
const _tuple = <T extends string[]>(...args: T) => args
export const DATATYPES = _tuple('static', 'dynamic')
type fontifyUnion = 'circled' | 'circledNeg' | 'fullwidth' | 'mathBold' | 'mathBoldFraktur' | 'mathBoldItalic' | 'mathBoldScript' | 'mathDoubleStruck'
  | 'mathMonospace' | 'mathSans' | 'mathSansBold' | 'mathSansBoldItalic' | 'mathSansItalic' | 'parenthesized' | 'squared'
/**
 * Convert text to useless unicode fonts
 * @param str Normal string to convert
 * @param style E.G. mathSansBold or mathBoldFraktur
 */
export function fontify(str: string, style: fontifyUnion) {
  if (!(style in fontifyStyles) || !str) return str
  let out = ''
  for (let i = 0; i < str.length; i++) {
    if (fontifyAlpha.indexOf(str.charAt(i)) !== -1) {
      out += fontifyStyles[style][fontifyAlpha.indexOf(str.charAt(i))]
    } else out += str.charAt(i)
  }
  return out
}
