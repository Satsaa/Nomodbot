
/*
<message>       ::= ['@' <tags> <SPACE>] [':' <prefix> <SPACE> ] <command> <params> <crlf>
<prefix>        ::= [<nick>!<user>@][url] // My interpretation based on v3.3 examples
<tags>          ::= <tag> [';' <tag>]*
<tag>           ::= <key> ['=' <escaped value>]
<key>           ::= [ <vendor> '/' ] <sequence of letters, digits, hyphens (`-`)>
<escaped value> ::= <sequence of any characters except NUL, CR, LF, semicolon (`;`) and SPACE>
<vendor>        ::= <host>

 Character       Sequence in <escaped value>
---------------------------------------------
|; SEMICOLON     \: (backslash and COLON)   |
|SPACE           \s                         |
|\               \\                         |
|CR              \r                         |
|LF              \n                         |
|all others      the character itself       |
---------------------------------------------
*/

/**
 * Parse IRCv3 tagged messages  
 * Tries its hardest to give a result... even if `msg` is malformed
 * @param {string} msg Message to parse
 * @returns {IrcMessage} result
 */
module.exports = (msg) => {
  msg = msg.trimStart()
  if (msg.length === 0) return null

  /**
   * @typedef {object} IrcMessage Object form of an IRCv3 string message
   * @property {string | null} cmd Command name
   * @property {string | null} nick Portion before ! in prefix
   * @property {string[]} params Command parameters
   * @property {string | null} prefix Url prefix. Source of message
   * @property {{ [x: string]: string|true }} tags Key values pairs
   * @property {string | null} user Portion before (at) in prefix
   */

  /**
   * @type {IrcMessage}
   */
  let result = {
    cmd: null,
    nick: null,
    params: [],
    prefix: null,
    tags: {},
    user: null
  }

  let i = 0

  if (msg.charAt(i) === '@') {
    i++
    // Tags | @strValue=str;truthyVar;zeroLengthStr= 
    let nextSpace = msg.indexOf(' ')
    if (nextSpace === -1) nextSpace = msg.length
    let nextEquals = 0
    let nextSemiColon = 0
    while (i < nextSpace) {
      // find next '=', ';' or ' ' and slice keys and values based on those
      nextEquals = msg.indexOf('=', i)
      nextSemiColon = msg.indexOf(';', i)
      if (nextEquals === -1) { nextEquals = nextSpace }
      if (nextSemiColon === -1) { nextSemiColon = nextSpace }
      let minVal = Math.min(nextEquals, nextSpace, nextSemiColon)
      let lessMinVal = Math.min(nextSpace, nextSemiColon)
      // let key = msg.slice(i, minVal)
      let val = msg.slice(minVal + 1, lessMinVal)

      // Handle escaped characters | |\|;|\n|\r|
      // if (key.indexOf('\\') !== -1) key = key.replace(/\\:/g, ';').replace(/\\s/g, ' ').replace(/\\\\/g, '\\').replace(/\\r/g, '\r').replace(/\\n/g, '\n')
      if (val.indexOf('\\') !== -1) val = val.replace(/\\:/g, ';').replace(/\\s/g, ' ').replace(/\\\\/g, '\\').replace(/\\r/g, '\r').replace(/\\n/g, '\n')

      if (val === '' && msg.charAt(lessMinVal - 1) !== '=') val = true
      result.tags[msg.slice(i, minVal)] = val
      i = lessMinVal + 1
    }
  }

  let nextSpace = msg.indexOf(' ', i)
  if (nextSpace === -1) nextSpace = msg.length

  // Prefix and its user and nick | nick!user@example.com
  if (msg.charAt(i) === ':') {
    result.prefix = msg.slice(i + 1, nextSpace)
    let prefixNextExclam = result.prefix.indexOf('!')
    if (prefixNextExclam !== -1) result.nick = result.prefix.slice(0, prefixNextExclam)
    let prefixNextAt = result.prefix.indexOf('@')
    if (prefixNextAt !== -1) result.user = result.prefix.slice(prefixNextExclam === -1 ? 0 : prefixNextExclam + 1, prefixNextAt)
    i = nextSpace
  }

  nextSpace = msg.indexOf(' ', i + 1)
  if (nextSpace === -1) nextSpace = msg.length

  // Command
  if (i < nextSpace) result.cmd = msg.slice(i === 0 ? 0 : i + 1, nextSpace)

  i = nextSpace + 1
  let nextColon = msg.indexOf(':', i)
  if (nextColon === -1) nextColon = msg.length

  // Parameters
  while (i < nextColon) {
    nextSpace = msg.indexOf(' ', i)
    if (nextSpace === -1) nextSpace = msg.length
    result.params.push(msg.slice(i, nextSpace))
    i = nextSpace + 1
  }
  // Possible multi word parameter ':this is a chat message'
  if (nextColon !== msg.length) result.params.push(msg.slice(i + 1, msg.length))

  return result
}
