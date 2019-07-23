
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
  raw: string
  // The most elegant solution
  tags: {
    [x: string]: string | undefined
    // @ts-ignore
    badges?: { [badge: string]: number }
    // @ts-ignore
    'badge-info'?: { [badge: string]: number }
    // @ts-ignore
    emotes?: { [emote: string]: {start: number, end: number} }
    // @ts-ignore
    'display-name'?: string
    // @ts-ignore
    'user-id'?: number
    // @ts-ignore
    'emote-only'?: number
    // @ts-ignore
    'followers-only'?: number
    // @ts-ignore
    'subs-only'?: number
    // @ts-ignore
    'slow'?: number
    // @ts-ignore
    'ban-duration'?: number
    // @ts-ignore
    'msg-param-months'?: number
    // @ts-ignore
    'msg-param-cumulative-months'?: number
    // @ts-ignore
    'msg-param-origin-id'?: number
    // @ts-ignore
    'msg-param-recipient-id'?: number
    // @ts-ignore
    'msg-param-sender-count'?: number
    // @ts-ignore
    'msg-param-mass-gift-count'?: number
    // @ts-ignore
    'viewer-count'?: number
  }
  prefix: string | null
  nick: string | null
  user: string | null
  cmd: string | null
  params: string[]
}

const conversions: {[tag: string]: (v: string) => any} = {
  emotes,
  badges,
  'badge-info': badges,
  'user-id': num,
  'emote-only': num,
  'followers-only': num,
  'subs-only': num,
  'slow': num,
  'ban-duration': num,
  'msg-param-months': num,
  'msg-param-cumulative-months': num,
  'msg-param-origin-id': num,
  'msg-param-recipient-id': num,
  'msg-param-sender-count': num,
  'msg-param-mass-gift-count': num,
  'viewer-count': num,
}

function num(v: string) {
  return ~~v
}

function emotes(v: string) { // emotes=25:0-4/354:6-10/1:12-13
  if (typeof v === 'string' && v !== '') {
    const emotes: { [emote: string]: {start: number, end: number} } = {}
    const splitted = v.split('/')
    splitted.forEach((fullEmote) => {
      const emote: string[] = fullEmote.split(':')
      const area = emote[1].split('-')
      emotes[emote[0]] = { start: ~~area[0], end: ~~area[1] }
    })
    return emotes
  } else {
    return {}
  }
}

function badges(v: string) {
  if (typeof v === 'string' && v !== '') {
    const badges: {[badge: string]: number} = {}
    const splitted = v.split(',')
    splitted.forEach((fullBadge) => {
      const badge = fullBadge.split('/')
      badges[badge[0]] = ~~badge[1]
    })
    return badges
  } else {
    return {}
  }
}

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

      let val: string = msg.slice(minIndex + 1, semiMinIndex)

      // Unescape characters: ' ' '/' ';' '\n' '\r'
      if (val.includes('\\')) {
        val = val.replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }

      const tag = msg.slice(i, minIndex)

      // Convert specific tags to other formats
      if (conversions[tag]) {
        val = conversions[tag](val)
      }

      result.tags[tag] = val // Normal tag
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

export interface PRIVMSG {
  raw: string
  tags: Required<Pick<IrcMessage['tags'], 'badge-info' | 'badges' | 'color' | 'display-name' | 'emotes' | 'flags' | 'id' | 'mod' | 'room-id' | 'subscriber' | 'tmi-sent-ts' | 'turbo' | 'user-id' | 'user-type'>> & Partial<Pick<IrcMessage['tags'], 'bits'>>
  prefix: string
  nick: string
  user: string
  cmd: 'PRIVMSG'
  params: [string, string]
}
