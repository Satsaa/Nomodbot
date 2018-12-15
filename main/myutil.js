
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

/** Insert to a string at pos
 * @param {any} str String to insert into
 * @param {any} index Where to insert
 * @param {any} insert What to insert
 * @return {string}
 */
module.exports.insert = insert
function insert (str, index, insert) {
  return str.substr(0, index) + insert + str.substr(index)
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

/** Adds '.' at the end of your string if it doesnt already have it (ignores trailing whitespace)
 * @param {string} string Input string
 */
module.exports.endPunctuate = (string) => {
  let pos = string.search(/\s*$/) // Start index of whitespace
  if (string.charAt(pos - 1) === '.') return string
  else return insert(string, pos, '.')
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
/**
 * Converts bytes to a more readable format
 * @param {number} bytes Bytes to convert
 * @param {number} decimals Maximum outputted decimal places. Default = 0
 */
module.exports.formatBytes = (bytes, decimals = 0) => {
  if (bytes === 0) return '0 Bytes'
  if (bytes === 1) return '1 Byte'
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  var i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals)) + ' ' + sizes[i]
}

let alpha = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890<>(){}[]&#%/,.:;_-+|?!'"'*=`
let styles = {
  'circled': Array.from('ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ①②③④⑤⑥⑦⑧⑨⓪⧀⧁(){}[]&#%⊘,⨀:;_⊖⊕⦶?!\'"\'⊛⊜]'),
  'circledNeg': Array.from('🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩❶❷❸❹❺❻❼❽❾⓿<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'fullwidth': Array.from('ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ１２３４５６７８９０<>（）｛｝［］＆＃％／，．：；＿－＋｜？！\'"＇＊＝]'),
  'mathBold': Array.from('𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗𝟎<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathBoldFraktur': Array.from('𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathBoldItalic': Array.from('𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathBoldScript': Array.from('𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathDoubleStruck': Array.from('𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡𝟘<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathMonospace': Array.from('𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿𝟶<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathSans': Array.from('𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫𝟢<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathSansBold': Array.from('𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵𝟬<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathSansBoldItalic': Array.from('𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'mathSansItalic': Array.from('𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡1234567890<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'parenthesized': Array.from('⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵⑴⑵⑶⑷⑸⑹⑺⑻⑼0<>(){}[]&#%/,.:;_-+|?!\'"\'*=]'),
  'squared': Array.from('🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉1234567890<>(){}[]&#%⧄,⊡:;_⊟⊞|?!\'"\'⧆=]')
}
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
