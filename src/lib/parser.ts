
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

export interface IrcMessage {
  tags: { [x: string]: string | true },
  prefix: string | null,
  nick: string | null,
  user: string | null,
  cmd: string | null,
  params: string[]
}

/**
 * Parse IRCv3 tagged messages  
 * Tries its hardest to give a result... even if `msg` is malformed
 * @param msg Message to parse
 */
export default function parse(msg: string): IrcMessage | null {

  msg = msg.trimLeft()
  if (msg.length === 0) return null

  const result: IrcMessage = {
    cmd: null,
    nick: null,
    params: [],
    prefix: null,
    tags: {},
    user: null,
  }

  let i = 0

  if (msg.charAt(i) === '@') {
    i++
    // Tags | @strValue=str;truthyVar;zeroLengthStr=
    let nextSpace = msg.indexOf(' ')
    if (nextSpace === -1) nextSpace = msg.length

    // find next '=', ';' or ' ' and slice keys and values based on those
    while (i < nextSpace) {
      let nextEquals = msg.indexOf('=', i)
      let nextSemiColon = msg.indexOf(';', i)
      if (nextEquals === -1) { nextEquals = nextSpace }
      if (nextSemiColon === -1) { nextSemiColon = nextSpace }
      const minIndex = Math.min(nextEquals, nextSpace, nextSemiColon)
      const semiMinIndex = Math.min(nextSpace, nextSemiColon)

      let val = msg.slice(minIndex + 1, semiMinIndex)

      // Handle escaped characters: ' ' '/' ';' '\n' '\r'
      if (val.indexOf('\\') !== -1) {
        val = val.replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }

      result.tags[msg.slice(i, minIndex)] = (val === '' && msg.charAt(semiMinIndex - 1) !== '=') ? true : val
      i = semiMinIndex + 1
    }
  }

  let nextSpace = msg.indexOf(' ', i)
  if (nextSpace === -1) nextSpace = msg.length

  // Prefix and its user and nick | nick!user@example.com
  if (msg.charAt(i) === ':') {
    result.prefix = msg.slice(i + 1, nextSpace)
    const prefixNextExclam = result.prefix.indexOf('!')
    if (prefixNextExclam !== -1) result.nick = result.prefix.slice(0, prefixNextExclam)
    const prefixNextAt = result.prefix.indexOf('@')
    if (prefixNextAt !== -1) {
      result.user = result.prefix.slice(prefixNextExclam === -1 ? 0 : prefixNextExclam + 1, prefixNextAt)
    }
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
