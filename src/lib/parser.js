
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
 * Parse ircV3 tagged messages  
 * Tries its hardest to give a result... even if the message is probably malformed
 */
module.exports = (msg) => {
  msg = msg.trimStart()
  if (msg.length === 0) return null

  let parse = {
    tags: {},
    nick: null,
    user: null,
    prefix: null,
    cmd: null,
    params: []
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
      parse.tags[msg.slice(i, minVal)] = val
      i = lessMinVal + 1
    }
  }

  let nextSpace = msg.indexOf(' ', i)
  if (nextSpace === -1) nextSpace = msg.length

  // Prefix and its user and nick | nick!user@example.com
  if (msg.charAt(i) === ':') {
    parse.prefix = msg.slice(i + 1, nextSpace)
    let prefixNextExclam = parse.prefix.indexOf('!')
    if (prefixNextExclam !== -1) parse.nick = parse.prefix.slice(0, prefixNextExclam)
    let prefixNextAt = parse.prefix.indexOf('@')
    if (prefixNextAt !== -1) parse.user = parse.prefix.slice(prefixNextExclam === -1 ? 0 : prefixNextExclam + 1, prefixNextAt)
    i = nextSpace
  }

  nextSpace = msg.indexOf(' ', i + 1)
  if (nextSpace === -1) nextSpace = msg.length

  // Command
  if (i < nextSpace) parse.cmd = msg.slice(i === 0 ? 0 : i + 1, nextSpace)

  i = nextSpace + 1
  let nextColon = msg.indexOf(':', i)
  if (nextColon === -1) nextColon = msg.length

  // Parameters
  while (i < nextColon) {
    nextSpace = msg.indexOf(' ', i)
    if (nextSpace === -1) nextSpace = msg.length
    parse.params.push(msg.slice(i, nextSpace))
    i = nextSpace + 1
  }
  // Possible multi word parameter ':this is a chat message'
  if (nextColon !== msg.length) parse.params.push(msg.slice(i + 1, msg.length))

  return parse
}
