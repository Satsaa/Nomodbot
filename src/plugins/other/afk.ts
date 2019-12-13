import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
import { PRIVMSG } from '../../main/client/parser'

export const options: PluginOptions = {
  type: 'command',
  id: 'afk',
  title: 'Afk',
  description: 'Marks the current user as AFK and informs others when they mention the user with @user',
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
    count: number
  }
}

const MIN_INTERVAL = 1000 * 30

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private listener: any
  private disabled: boolean = false

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
      message: message ? message.join(' ') : undefined,
      lastMs: Date.now(),
      count: 0,
    }

    return 'Users will be informed that you are afk'
  }

  public async unload() {
    this.l.emitter.removeListener('chat', this.listener)
  }

  private async onChat(channelId: number, userId: number, message: string, irc: PRIVMSG, me: boolean, self: boolean) {
    if (self) { return }

    const atIndex3 = message.indexOf('$$$money$$$bitches$$$')
    if (atIndex3 !== -1) {
      this.l.chat(channelId, 'Disabled!')
      this.disabled = true
      return
    }

    const data = this.l.getData(channelId, 'afk') as AfkData
    if (data === undefined) {
      if (!this.disabled) { this.l.chat(channelId, 'No data') }
      return
    }

    if (data[userId]) {
      const userData = data[userId]
      this.l.chat(channelId, `@${irc.tags['display-name']} Welcome back! ${userData.count ? `${this.l.u.plural(userData.count, 'user')} got notified` : 'No one was notified :('}`)
      delete data[userId]
    }

    const atIndex = message.indexOf('@')
    if (atIndex === -1) {
      if (!this.disabled) { this.l.chat(channelId, 'No index') }
      return
    }

    const mentions = this.l.u.deduplicate(this.l.getMentions(message), true)

    const afks: Array<AfkData[number]> = []
    const afkerIds: number[] = []
    const afkerDisplays: string[] = []
    for (const mention of mentions) {
      const uid = this.l.api.cachedId(mention)
      if (!uid) continue

      if (data[uid]) {
        afks.push(data[uid])
        afkerIds.push(uid)
        afkerDisplays.push(this.l.api.cachedDisplay(uid) || 'unknown')
      }
    }

    if (afks.length) {
      try {
        if (afks.length === 1) {
          const userData = afks[0]
          if (!userData) return
          userData.count++
          if (userData.lastMs < Date.now() - MIN_INTERVAL) {
            userData.lastMs = Date.now()
            this.l.chat(channelId, `@${irc.tags['display-name']} ${this.l.api.cachedDisplay(afkerDisplays[0])} is afk${userData.message ? `: ${userData.message}` : ''}`)
          } else {
            this.l.whisper(userId, `${this.l.api.cachedDisplay(afkerDisplays[0])} is afk${userData.message ? `: ${userData.message}` : ''}`)
          }
        } else {
          afks.forEach(afk => afk.count++)
          if (afkerIds.every(v => data[v].lastMs < Date.now() - MIN_INTERVAL)) { // Whisper if all are on cooldown
            for (const uid of afkerIds) data[uid].lastMs = Date.now()
            this.l.chat(channelId, `@${irc.tags['display-name']} ${this.l.u.commaPunctuate(afkerDisplays)} are afk`)
          } else {
            this.l.whisper(userId, `${this.l.u.commaPunctuate(afkerDisplays)} are afk`)
          }
        }
      } catch (err) {
        const asd: Error = err
        this.l.chat(channelId, `${asd.name} || ${asd.message} || ${asd.stack}`)
      }
    } else if (!this.disabled) { this.l.chat(channelId, 'No length') }
  }
}
