import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
import { PRIVMSG } from '../../main/client/parser'

export const options: PluginOptions = {
  type: 'command',
  id: 'afk',
  title: 'Afk',
  description: 'Marks the current use as AFK and informs others when they mention the user with @user',
  default: {
    alias: '?afk',
    options: {
      userlvl: userlvls.sub, // Safety
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Go AFK and inform others when they mention you with @user: {alias} [<message...>]'],
  creates: [['afk']],
  allowMentions: true,
  whisperOnCd: true,
}

interface AfkData {
  [userId: number]: {
    message?: string
    lastMs: number
  }
}

const MIN_INTERVAL = 1000 * 30

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private listener: any

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.l.autoLoad('afk', {})

    this.l.emitter.on('chat', this.listener = this.onChat.bind(this))

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<message...>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [message]: [string[] | undefined] = params

    const data = this.l.getData(channelId, 'afk') as AfkData
    if (data === undefined) return 'Data unavailable. Afk requests cannot be handled at this time'

    data[userId] = {
      message: message ? message.join() : undefined,
      lastMs: Date.now(),
    }

    return 'Users will be informed that you are afk'
  }

  public async unload() {
    this.l.emitter.removeListener('chat', this.listener)
  }

  private async onChat(channelId: number, userId: number, message: string, irc: PRIVMSG, me: boolean, self: boolean) {
    if (self) return

    const data = this.l.getData(channelId, 'afk') as AfkData
    if (data === undefined) return

    if (data[userId]) delete data[userId]

    const atIndex = message.indexOf('@')
    if (atIndex === -1) return

    const mentions = this.l.u.deduplicate(this.l.getMentions(message), true)

    const afks: AfkData[] = []
    const afkerIds: number[] = []
    const afkerDisplays: string[] = []
    for (const user of mentions) {
      const uid = this.l.api.cachedId(user)
      if (!uid) continue

      if (data[uid]) {
        afks.push(data[uid])
        afkerIds.push(uid)
        afkerDisplays.push(this.l.api.cachedDisplay(uid) || 'unknown')
      }
    }

    if (afks.length) {
      if (afks.length === 1) {
        const afkData = data[afkerIds[0]]
        if (afkData && afkData.lastMs < Date.now() - MIN_INTERVAL) {
          afkData.lastMs = Date.now()
          this.l.chat(channelId, `@${irc.tags['display-name']} ${this.l.api.cachedDisplay(afkerDisplays[0])} is afk${afkData.message ? `: ${afkData.message}` : ''}`)
        } else {
          this.l.whisper(userId, `${this.l.api.cachedDisplay(afkerDisplays[0])} is afk${afkData.message ? `: ${afkData.message}` : ''}`)
        }
      } else if (afkerIds.every(v => data[v].lastMs < Date.now() - MIN_INTERVAL)) { // Ignore if all are on cooldown
        for (const uid of afkerIds) data[uid].lastMs = Date.now()
        this.l.chat(channelId, `@${irc.tags['display-name']} ${this.l.u.commaPunctuate(afkerDisplays)} are afk`)
      } else {
        this.l.whisper(userId, `${this.l.u.commaPunctuate(afkerDisplays)} are afk`)
      }
    }
  }
}
