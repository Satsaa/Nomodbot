
import fs from 'fs'
import { resolve } from 'path'

interface Category {
  /** Whether or not this category is saved on disk */
  saved?: boolean
  /**
   * Whether or not this category is disabled.
   * Logs are still saved on disk if enabled, but messages are not displayed. 
   */
  disabled?: boolean
  /** Use this instead of console.log (eg. console.error) */
  handler?: (...messages: any[]) => any
  /** Override the default prefix of [CATEGORY]. Set to '' to have no prefix */
  prefix?: string
  /** Foreground color for logged text */
  color?: keyof typeof fgColors
  /** Background color for logged text */
  background?: keyof typeof bgColors
}

interface Options {
  /** Enabling this will ensure all categories give the right line number, but disables saving functionality. */
  noSave?: boolean
}

const fgColors = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
} as const

const bgColors = {
  black: '\x1b[40m',
  red: '\x1b[41m',
  green: '\x1b[42m',
  yellow: '\x1b[43m',
  blue: '\x1b[44m',
  magenta: '\x1b[45m',
  cyan: '\x1b[46m',
  white: '\x1b[47m',

  gray: '\x1b[100m',
  brightRed: '\x1b[101m',
  brightGreen: '\x1b[102m',
  brightYellow: '\x1b[103m',
  brightBlue: '\x1b[104m',
  brightMagenta: '\x1b[105m',
  brightCyan: '\x1b[106m',
  brightWhite: '\x1b[107m',
} as const

/**
 * Creates an object with getters for each property in `cats`.
 * Each property returns console.log or a wrapper which calls console.log and saves the messages.
 * Saved categories do not preserve the line number.
 * @param cats
 * @param path Path to a directory where logging-enabled messages will be saved (*path*\/*cat*.txt).
 * @param options Options object with following optional settings:
 * `noSave` disables saving functionality. Ensures each category preserver line number.
 */
function makeLogger<T extends {[cat: string]: Category}>(cats: T, path: string, options: Options): {[P in keyof T]: (...messages: any[]) => any} {
  const res = {}
  const streams: {[path: string]: fs.WriteStream} = {}
  path = resolve(path)
  fs.mkdirSync(path, { recursive: true })

  for (const cat in cats) {
    Object.defineProperty(res, cat, {
      get: () => {
        const colorPrefix = getColor(cats[cat])
        if (!options.noSave && cats[cat].saved) {
          return (...messages: string[]) => {
            save(`${path}/${cat}.txt`, messages)
            if (!cats[cat].disabled) {
              const handler = cats[cat].handler || console.log
              if (cats[cat].prefix === undefined) {
                if (colorPrefix) handler(colorPrefix, `[${cat.toUpperCase()}]`, ...messages)
                else handler(`[${cat.toUpperCase()}]`, ...messages)
              } else if (cats[cat].prefix === '') {
                if (colorPrefix) handler(colorPrefix, ...messages)
                else handler(...messages)
              } else if (colorPrefix) {
                handler(colorPrefix, `${cats[cat].prefix}`, ...messages)
              } else {
                handler(`${cats[cat].prefix}`, ...messages)
              }
            }
          }
        } else if (!cats[cat].disabled) {
          const handler = cats[cat].handler || console.log
          if (cats[cat].prefix === undefined) {
            if (colorPrefix) return handler.bind(handler, colorPrefix, `[${cat.toUpperCase()}]`)
            else return handler.bind(handler, `[${cat.toUpperCase()}]`)
          } else if (cats[cat].prefix === '') {
            if (colorPrefix) return handler.bind(handler, colorPrefix)
            else return handler
          } else if (colorPrefix) {
            return handler.bind(handler, colorPrefix, cats[cat].prefix)
          } else {
            return handler.bind(handler, cats[cat].prefix)
          }
        }

        return () => undefined
      },
    })
  }

  return res as any

  function getColor(cat: Category) {
    let res = ''
    if (cat.background) res += bgColors[cat.background]
    if (cat.color) res += fgColors[cat.color]
    if (res) res += '%s'
    return res
  }

  function save(path: string, messages: any[]) {
    const final = `${messages.reduce((acc, cur) => {
      if (typeof cur === 'object') return `${acc}\n${JSON.stringify(cur)}` // Null works too
      return `${acc}\n${cur}`
    })}\n`

    const stream = streams[path]
    if (stream) {
      stream.write(final)
    } else {
      streams[path] = fs.createWriteStream(path, { flags: 'a' })
      streams[path].write(final)
      streams[path].once('close', () => {
        delete streams[path]
      })
    }
  }
}

/**
 * The used options object. Properties are free to be changed.
 */
export const options: Options = {
  noSave: false,
}

const categories = {
  error: { saved: true, handler: console.error },
  warn: { handler: console.error, color: 'yellow' },
  info: {},
  debug: { disabled: true },

  raw: { prefix: '', disabled: true },
  strange: { saved: true, handler: console.error },
  chat: { prefix: '[CHAT]', color: 'gray' },
  botChat: { prefix: '[BOT]', color: 'green' },

  apiError: { saved: true, handler: console.error },
  apiInfo: {},
  apiDebug: {},

  botInfo: {},
  userInfo: { color: 'gray' },
  channelInfo: { color: 'gray' },

  pluginError: { saved: true, handler: console.error },
  pluginInfo: {},
  pluginDebug: {},
} as const

const logger = makeLogger(categories, './data/logs/', options)

/**
 * Copy of the logger. All imports receive the same logger.
 * 
 * `error`: Important errors.  
 * `warn`: Important warnings.  
 * `info`: Generic info.  
 * `debug`: Debugging info.  
 *
 * `raw`: Raw irc messages.  
 * `strange`: Unhandled irc messages. Provide a reason in first arg.  
 * `chat`: Chat messages by any user. {channel} user: msg  
 * `botChat`: Chat messages sent by the bot.  
 * `api`: Twitch API shenanigans.  
 *
 * `botInfo`: Generic info about the bot (as a user of twitch).  
 * `userInfo`: Generic info about users.  
 * `channelInfo`: Generic info about channels.  
 *
 * `pluginAction`: User does an action with a command.  
 * `pluginInfo`: Generic info from plugins.  
 * `pluginDebug`: Debugging from plugins.  
 */
export default logger
