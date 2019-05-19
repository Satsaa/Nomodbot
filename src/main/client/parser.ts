
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
  raw: string,
  tags: {
    [x: string]: string | number | true,
    // @ts-ignore // Restrictive indexes FeelsWeirdMan
    badges?: { [badge: string]: number },
    // @ts-ignore
    emotes?: { [emote: string]: {start: number, end: number} },
    // @ts-ignore
    'display-name'?: string,
    // @ts-ignore
    'user-id'?: number,
  },
  prefix: string | null,
  nick: string | null,
  user: string | null,
  cmd: string | null,
  params: string[]
}

const array = [

]

/**
 * Parse IRCv3 tagged messages  
 * Tries its hardest to give a result... even if `msg` is malformed
 * @param msg Message to parse
 */
export default function parse(msg: string): IrcMessage | null {

  const result: IrcMessage = {
    raw: msg,
    tags: {},
    prefix: null,
    nick: null,
    user: null,
    cmd: null,
    params: [],
  }

  msg = msg.trimLeft()
  if (msg.length === 0) return null

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

      let val: string | number | true = msg.slice(minIndex + 1, semiMinIndex)

      // Unescape characters: ' ' '/' ';' '\n' '\r'
      if (val.indexOf('\\') !== -1) {
        val = val.replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      } else if (val.length === 0) val = nextEquals > semiMinIndex ? true : val
      else {
        const prev = val
        val = +val
        if (isNaN(val)) val = prev
      }

      const tag = msg.slice(i, minIndex)
      if (tag === 'badges') { // badges=moderator/1,subscriber/1
        if (typeof val === 'string' && val !== '') {
          const badges: {[badge: string]: number} = {}
          const splitted = val.split(',')
          splitted.forEach((fullBadge) => {
            const badge = fullBadge.split('/')
            badges[badge[0]] = ~~badge[1]
          })
          result.tags.badges = badges
        } else result.tags.badges = {}
      } else if (tag === 'emotes') { // emotes=25:0-4/354:6-10/1:12-13
        if (typeof val === 'string' && val !== '') {
          const emotes: { [emote: string]: {start: number, end: number} } = {}
          const splitted = val.split('/')
          splitted.forEach((fullEmote) => {
            const emote: string[] = fullEmote.split(':')
            const area = emote[1].split('-')
            emotes[emote[0]] = {start: ~~area[0], end: ~~area[1]}
          })
          result.tags.emotes = emotes
        } else result.tags.emotes = {}
      } else result.tags[tag] = val // Normal tag
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
