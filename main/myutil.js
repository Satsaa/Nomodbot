
/** Returns a random integer betweent min and max
 * @param {number} min Minimum possible output
 * @param {number} max Maximum possible output
 */
module.exports.getRandomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min // The maximum is exclusive and the minimum is inclusive
}

/** Returns a random property value of an object
 * @param {object} obj Searched object
 */
module.exports.getRandomProperty = (obj) => {
  var keys = Object.keys(obj)
  return obj[keys[keys.length * Math.random() << 0]]
}

/** Returns a random property name of an object
 * @param {object} obj Searched object
 */
module.exports.getRandomKey = (obj) => {
  var keys = Object.keys(obj)
  return keys[keys.length * Math.random() << 0]
}

/** Returns a random normalized number between min and max
 * @param {number} min Minimum possible output. Default = 0
 * @param {number} max Maximum possible output. Default = 100
 * @param {number} skew Skews the normal mean closer to min (<1) or max (>1). Default = 1
 */
module.exports.randomNormal = (min = 0, max = 100, skew = 1) => {
  return Math.pow(((Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random())) / 10.0 + 0.5), skew) * (max - min) + min
}

/** Allow using negative indexes to get -nth last index and limits index to 1-max
 * @param {number} index Input index
 * @param {number} max Maximum index
 */
module.exports.smartIndex = (index, max) => {
  if (index < 0) {
    if (index < -max) return 1
    return max + index + 1 // 100 -1 + 1
  }
  if (index < 1) return 1
  if (index > max) return max
  return index
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
 * @param {number} top - How many time units to return. Default = 4
 * @param {boolean} short - To use short units (d or days). Default = true
 */
module.exports.timeUntill = (ms, top = 4, short = 1) => {
  let t = MSToDHMS(ms - Date.now()) // time
  return timeStr(t, top, short)
}

/** Get string telling how long untill ms
 * @param {number} ms - Time to use
 * @param {number} top - How many time units to return. Default = 4
 * @param {boolean} short - To use short units (d or days). Default = true
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
  let dateStrLong = [' day', ' hour', ' minute', ' second']
  let dateStrShort = ['d', 'h', 'm', 's']

  for (let i = 0; i < 4; i++) {
    if (t[i]) {
      exists++
      if (exists < top + 1) {
        if (short) untill[i] = t[i] + dateStrShort[i] // short
        else { // long with singular/plural
          if (t[i] === 1) untill[i] = t[i] + dateStrLong[i] // singular
          else untill[i] = t[i] + dateStrLong[i] + 's' // plural
        }
      }
    }
  }
  let str = untill.join(' ').trim()
  if (str === '') {
    return short ? '0s' : '0 seconds'
  }
  return str
}

/** Returns time converted to YYYY-MM-DD, the only logical format
 * @param {any} ms Time in ms
 * @param {any} delim Char or string to put between numbers. undefined = '-'
 */
module.exports.dateString = (ms, delim) => {
  let dateStr = new Date(ms).toISOString()
  dateStr = dateStr.substring(0, dateStr.indexOf('T'))
  if (delim) return dateStr.replace(new RegExp(delim, 'gi'), '')
  else return dateStr
}

/** Returns inputted singular or plural based on v's value
 * @param {any} v If this is 1 or '1' returns singular
 * @param {any} singular Singular form
 * @param {any} plural Plural form. If omitted uses singular + 's'.
 * @return {string}
 */
module.exports.plural = (v, singular, plural) => {
  return (v === 1 || v === '1' ? singular : (plural || singular + 's'))
}

/** Capitalizes a single character at pos
 * @param {string} string Input string
 * @param {number} pos What char to capitalize. Default = 0
 */
module.exports.cap = (string, pos = 0) => {
  return string.slice(0, pos) + string.charAt(pos).toUpperCase() + string.slice(pos + 1)
}

/** Add proper punctuation between words (Peter, Jones and Malfoy)
 * @param {array} words to punctuate between
 */
module.exports.commaPunctuate = (words) => {
  if (words.length === 1) return words[0]
  if (!words.length) return null
  for (let i = 0; i < words.length; i++) {
    if (!words[i]) {
      words.splice(i, 1)
      i--
    }
  }
  let str = ''
  for (let i = 0; i < words.length; i++) {
    if (i === words.length - 1) str += words[i]
    else if (i === words.length - 2) str += words[i] + ' and '
    else str += words[i] + ', '
  }
  return str
}

/** Adds the appropriate article to the word
 * @param {string} word Check article against this
 */
module.exports.addArticle = (word) => {
  let at = word.charAt(0) === ' ' ? 1 : 0
  var vowels = ['a', 'e', 'i', 'o', 'u', 8, '8']
  if (vowels.indexOf(word.charAt(at).toLowerCase()) >= 0) return 'an ' + word
  if (word.startsWith('18')) return 'an ' + word
  return 'a ' + word
}

/** Add ordinal of an integer (st,nd,rd,th) to the integer and returns it as a string
 * @param {number} i Check ordinal against this
 */
module.exports.addOrdinal = (i) => {
  var j = i % 10
  var k = i % 100
  if (j === 1 && k !== 11) {
    return i + 'st'
  }
  if (j === 2 && k !== 12) {
    return i + 'nd'
  }
  if (j === 3 && k !== 13) {
    return i + 'rd'
  }
  return i + 'th'
}

let alpha = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890<>(){}[]&#%/,.:;_-+|?!'"'*=`

/** Convert text to useless unicode fonts
 * @param {string} str Normal string to convert
 * @param {string} style circled, circledNeg, fullwidth, mathBold, mathBoldFraktur, mathBoldItalic, mathBoldScript, mathDoubleStruck, mathMonospace, mathSans, mathSansBold, mathSansBoldItalic, mathSansItalic, parenthesized, squared
 */
module.exports.fontify = (str, style) => {
  if (!(style in styles) || !str) return str
  let out = ''
  for (let i = 0; i < str.length; i++) {
    if (alpha.indexOf(str.charAt(i)) !== -1) {
      out += styles[style][alpha.indexOf(str.charAt(i))]
    } else out += str.charAt(i)
  } return out
}

/* eslint-disable */
let styles = {
  'circled': ['ⓐ', 'ⓑ', 'ⓒ', 'ⓓ', 'ⓔ', 'ⓕ', 'ⓖ', 'ⓗ', 'ⓘ', 'ⓙ', 'ⓚ', 'ⓛ', 'ⓜ', 'ⓝ', 'ⓞ', 'ⓟ', 'ⓠ', 'ⓡ', 'ⓢ', 'ⓣ', 'ⓤ', 'ⓥ', 'ⓦ', 'ⓧ', 'ⓨ', 'ⓩ', 'Ⓐ', 'Ⓑ', 'Ⓒ', 'Ⓓ', 'Ⓔ', 'Ⓕ', 'Ⓖ', 'Ⓗ', 'Ⓘ', 'Ⓙ', 'Ⓚ', 'Ⓛ', 'Ⓜ', 'Ⓝ', 'Ⓞ', 'Ⓟ', 'Ⓠ', 'Ⓡ', 'Ⓢ', 'Ⓣ', 'Ⓤ', 'Ⓥ', 'Ⓦ', 'Ⓧ', 'Ⓨ', 'Ⓩ', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⓪', '⧀', '⧁', '(', ')', '{', '}', '[', ']', '&', '#', '%', '⊘', ',', '⨀', ':', ';', '_', '⊖', '⊕', '⦶', '?', '!', '\'', '"', '\'', '⊛', '⊜'],
  'circledNeg': ['🅐', '🅑', '🅒', '🅓', '🅔', '🅕', '🅖', '🅗', '🅘', '🅙', '🅚', '🅛', '🅜', '🅝', '🅞', '🅟', '🅠', '🅡', '🅢', '🅣', '🅤', '🅥', '🅦', '🅧', '🅨', '🅩', '🅐', '🅑', '🅒', '🅓', '🅔', '🅕', '🅖', '🅗', '🅘', '🅙', '🅚', '🅛', '🅜', '🅝', '🅞', '🅟', '🅠', '🅡', '🅢', '🅣', '🅤', '🅥', '🅦', '🅧', '🅨', '🅩', '❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾', '⓿', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'fullwidth': ['ａ', 'ｂ', 'ｃ', 'ｄ', 'ｅ', 'ｆ', 'ｇ', 'ｈ', 'ｉ', 'ｊ', 'ｋ', 'ｌ', 'ｍ', 'ｎ', 'ｏ', 'ｐ', 'ｑ', 'ｒ', 'ｓ', 'ｔ', 'ｕ', 'ｖ', 'ｗ', 'ｘ', 'ｙ', 'ｚ', 'Ａ', 'Ｂ', 'Ｃ', 'Ｄ', 'Ｅ', 'Ｆ', 'Ｇ', 'Ｈ', 'Ｉ', 'Ｊ', 'Ｋ', 'Ｌ', 'Ｍ', 'Ｎ', 'Ｏ', 'Ｐ', 'Ｑ', 'Ｒ', 'Ｓ', 'Ｔ', 'Ｕ', 'Ｖ', 'Ｗ', 'Ｘ', 'Ｙ', 'Ｚ', '１', '２', '３', '４', '５', '６', '７', '８', '９', '０', '<', '>', '（', '）', '｛', '｝', '［', '］', '＆', '＃', '％', '／', '，', '．', '：', '；', '＿', '－', '＋', '｜', '？', '！', '\'', '"', '\＇', '＊', '＝'],
  'mathBold': ['𝐚', '𝐛', '𝐜', '𝐝', '𝐞', '𝐟', '𝐠', '𝐡', '𝐢', '𝐣', '𝐤', '𝐥', '𝐦', '𝐧', '𝐨', '𝐩', '𝐪', '𝐫', '𝐬', '𝐭', '𝐮', '𝐯', '𝐰', '𝐱', '𝐲', '𝐳', '𝐀', '𝐁', '𝐂', '𝐃', '𝐄', '𝐅', '𝐆', '𝐇', '𝐈', '𝐉', '𝐊', '𝐋', '𝐌', '𝐍', '𝐎', '𝐏', '𝐐', '𝐑', '𝐒', '𝐓', '𝐔', '𝐕', '𝐖', '𝐗', '𝐘', '𝐙', '𝟏', '𝟐', '𝟑', '𝟒', '𝟓', '𝟔', '𝟕', '𝟖', '𝟗', '𝟎', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathBoldFraktur': ['𝖆', '𝖇', '𝖈', '𝖉', '𝖊', '𝖋', '𝖌', '𝖍', '𝖎', '𝖏', '𝖐', '𝖑', '𝖒', '𝖓', '𝖔', '𝖕', '𝖖', '𝖗', '𝖘', '𝖙', '𝖚', '𝖛', '𝖜', '𝖝', '𝖞', '𝖟', '𝕬', '𝕭', '𝕮', '𝕯', '𝕰', '𝕱', '𝕲', '𝕳', '𝕴', '𝕵', '𝕶', '𝕷', '𝕸', '𝕹', '𝕺', '𝕻', '𝕼', '𝕽', '𝕾', '𝕿', '𝖀', '𝖁', '𝖂', '𝖃', '𝖄', '𝖅', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathBoldItalic': ['𝒂', '𝒃', '𝒄', '𝒅', '𝒆', '𝒇', '𝒈', '𝒉', '𝒊', '𝒋', '𝒌', '𝒍', '𝒎', '𝒏', '𝒐', '𝒑', '𝒒', '𝒓', '𝒔', '𝒕', '𝒖', '𝒗', '𝒘', '𝒙', '𝒚', '𝒛', '𝑨', '𝑩', '𝑪', '𝑫', '𝑬', '𝑭', '𝑮', '𝑯', '𝑰', '𝑱', '𝑲', '𝑳', '𝑴', '𝑵', '𝑶', '𝑷', '𝑸', '𝑹', '𝑺', '𝑻', '𝑼', '𝑽', '𝑾', '𝑿', '𝒀', '𝒁', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathBoldScript': ['𝓪', '𝓫', '𝓬', '𝓭', '𝓮', '𝓯', '𝓰', '𝓱', '𝓲', '𝓳', '𝓴', '𝓵', '𝓶', '𝓷', '𝓸', '𝓹', '𝓺', '𝓻', '𝓼', '𝓽', '𝓾', '𝓿', '𝔀', '𝔁', '𝔂', '𝔃', '𝓐', '𝓑', '𝓒', '𝓓', '𝓔', '𝓕', '𝓖', '𝓗', '𝓘', '𝓙', '𝓚', '𝓛', '𝓜', '𝓝', '𝓞', '𝓟', '𝓠', '𝓡', '𝓢', '𝓣', '𝓤', '𝓥', '𝓦', '𝓧', '𝓨', '𝓩', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathDoubleStruck': ['𝕒', '𝕓', '𝕔', '𝕕', '𝕖', '𝕗', '𝕘', '𝕙', '𝕚', '𝕛', '𝕜', '𝕝', '𝕞', '𝕟', '𝕠', '𝕡', '𝕢', '𝕣', '𝕤', '𝕥', '𝕦', '𝕧', '𝕨', '𝕩', '𝕪', '𝕫', '𝔸', '𝔹', 'ℂ', '𝔻', '𝔼', '𝔽', '𝔾', 'ℍ', '𝕀', '𝕁', '𝕂', '𝕃', '𝕄', 'ℕ', '𝕆', 'ℙ', 'ℚ', 'ℝ', '𝕊', '𝕋', '𝕌', '𝕍', '𝕎', '𝕏', '𝕐', 'ℤ', '𝟙', '𝟚', '𝟛', '𝟜', '𝟝', '𝟞', '𝟟', '𝟠', '𝟡', '𝟘', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathMonospace': ['𝚊', '𝚋', '𝚌', '𝚍', '𝚎', '𝚏', '𝚐', '𝚑', '𝚒', '𝚓', '𝚔', '𝚕', '𝚖', '𝚗', '𝚘', '𝚙', '𝚚', '𝚛', '𝚜', '𝚝', '𝚞', '𝚟', '𝚠', '𝚡', '𝚢', '𝚣', '𝙰', '𝙱', '𝙲', '𝙳', '𝙴', '𝙵', '𝙶', '𝙷', '𝙸', '𝙹', '𝙺', '𝙻', '𝙼', '𝙽', '𝙾', '𝙿', '𝚀', '𝚁', '𝚂', '𝚃', '𝚄', '𝚅', '𝚆', '𝚇', '𝚈', '𝚉', '𝟷', '𝟸', '𝟹', '𝟺', '𝟻', '𝟼', '𝟽', '𝟾', '𝟿', '𝟶', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathSans': ['𝖺', '𝖻', '𝖼', '𝖽', '𝖾', '𝖿', '𝗀', '𝗁', '𝗂', '𝗃', '𝗄', '𝗅', '𝗆', '𝗇', '𝗈', '𝗉', '𝗊', '𝗋', '𝗌', '𝗍', '𝗎', '𝗏', '𝗐', '𝗑', '𝗒', '𝗓', '𝖠', '𝖡', '𝖢', '𝖣', '𝖤', '𝖥', '𝖦', '𝖧', '𝖨', '𝖩', '𝖪', '𝖫', '𝖬', '𝖭', '𝖮', '𝖯', '𝖰', '𝖱', '𝖲', '𝖳', '𝖴', '𝖵', '𝖶', '𝖷', '𝖸', '𝖹', '𝟣', '𝟤', '𝟥', '𝟦', '𝟧', '𝟨', '𝟩', '𝟪', '𝟫', '𝟢', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathSansBold': ['𝗮', '𝗯', '𝗰', '𝗱', '𝗲', '𝗳', '𝗴', '𝗵', '𝗶', '𝗷', '𝗸', '𝗹', '𝗺', '𝗻', '𝗼', '𝗽', '𝗾', '𝗿', '𝘀', '𝘁', '𝘂', '𝘃', '𝘄', '𝘅', '𝘆', '𝘇', '𝗔', '𝗕', '𝗖', '𝗗', '𝗘', '𝗙', '𝗚', '𝗛', '𝗜', '𝗝', '𝗞', '𝗟', '𝗠', '𝗡', '𝗢', '𝗣', '𝗤', '𝗥', '𝗦', '𝗧', '𝗨', '𝗩', '𝗪', '𝗫', '𝗬', '𝗭', '𝟭', '𝟮', '𝟯', '𝟰', '𝟱', '𝟲', '𝟳', '𝟴', '𝟵', '𝟬', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathSansBoldItalic': ['𝙖', '𝙗', '𝙘', '𝙙', '𝙚', '𝙛', '𝙜', '𝙝', '𝙞', '𝙟', '𝙠', '𝙡', '𝙢', '𝙣', '𝙤', '𝙥', '𝙦', '𝙧', '𝙨', '𝙩', '𝙪', '𝙫', '𝙬', '𝙭', '𝙮', '𝙯', '𝘼', '𝘽', '𝘾', '𝘿', '𝙀', '𝙁', '𝙂', '𝙃', '𝙄', '𝙅', '𝙆', '𝙇', '𝙈', '𝙉', '𝙊', '𝙋', '𝙌', '𝙍', '𝙎', '𝙏', '𝙐', '𝙑', '𝙒', '𝙓', '𝙔', '𝙕', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'mathSansItalic': ['𝘢', '𝘣', '𝘤', '𝘥', '𝘦', '𝘧', '𝘨', '𝘩', '𝘪', '𝘫', '𝘬', '𝘭', '𝘮', '𝘯', '𝘰', '𝘱', '𝘲', '𝘳', '𝘴', '𝘵', '𝘶', '𝘷', '𝘸', '𝘹', '𝘺', '𝘻', '𝘈', '𝘉', '𝘊', '𝘋', '𝘌', '𝘍', '𝘎', '𝘏', '𝘐', '𝘑', '𝘒', '𝘓', '𝘔', '𝘕', '𝘖', '𝘗', '𝘘', '𝘙', '𝘚', '𝘛', '𝘜', '𝘝', '𝘞', '𝘟', '𝘠', '𝘡', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'parenthesized': ['⒜', '⒝', '⒞', '⒟', '⒠', '⒡', '⒢', '⒣', '⒤', '⒥', '⒦', '⒧', '⒨', '⒩', '⒪', '⒫', '⒬', '⒭', '⒮', '⒯', '⒰', '⒱', '⒲', '⒳', '⒴', '⒵', '⒜', '⒝', '⒞', '⒟', '⒠', '⒡', '⒢', '⒣', '⒤', '⒥', '⒦', '⒧', '⒨', '⒩', '⒪', '⒫', '⒬', '⒭', '⒮', '⒯', '⒰', '⒱', '⒲', '⒳', '⒴', '⒵', '⑴', '⑵', '⑶', '⑷', '⑸', '⑹', '⑺', '⑻', '⑼', '0', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '/', ',', '.', ':', ';', '_', '-', '+', '|', '?', '!', '\'', '"', '\'', '*', '='],
  'squared': ['🄰', '🄱', '🄲', '🄳', '🄴', '🄵', '🄶', '🄷', '🄸', '🄹', '🄺', '🄻', '🄼', '🄽', '🄾', '🄿', '🅀', '🅁', '🅂', '🅃', '🅄', '🅅', '🅆', '🅇', '🅈', '🅉', '🄰', '🄱', '🄲', '🄳', '🄴', '🄵', '🄶', '🄷', '🄸', '🄹', '🄺', '🄻', '🄼', '🄽', '🄾', '🄿', '🅀', '🅁', '🅂', '🅃', '🅄', '🅅', '🅆', '🅇', '🅈', '🅉', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '<', '>', '(', ')', '{', '}', '[', ']', '&', '#', '%', '⧄', ',', '⊡', ':', ';', '_', '⊟', '⊞', '|', '?', '!', '\'', '"', '\'', '⧆', '=']
}