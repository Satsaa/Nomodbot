import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'
import { ACTION, CHAT, LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'randomquote',
  name: 'RandomQuote',
  description: 'Shows a random message someone has sent in {channel}',
  default: {
    alias: ['?randomquote', '?rq'],
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: [
    'Show a random message someone or user has sent: {alias} [<user>] [<index>]',
  ],
  requiresPlugins: ['log'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    if (params[1]) { // User specific message
      let uid: number = userId
      let index = 0
      if (isNaN(+params[1])) {
        uid = (await this.l.api.getId(params[1])) || userId
        const count = this.log.msgCount(channelId, uid)
        if (typeof count === 'undefined') return 'Log data is unavailable at the moment'
        index = isNaN(+params[2]) ?  this.l.u.randomInt(0, count) : +params[2]
      } else index = +params[1]

      const res = await this.log.getSmartIndexMsg(channelId, uid, index)
      if (!res) return 'That user has no logged messages'
      if (res.type === CHAT || res.type === ACTION) {
        return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
      }
      return `Logger returned an invalid type: ${res.type}`
    } else { // Any message
      const data = this.log.getData(channelId)
      if (!data) return 'Log data is unavailable at the moment'

      const randomI = this.l.u.randomInt(0, data.messageCount - 1)
      let currentI = 0
      for (const uIdStr in data.users) {
        const userId = ~~uIdStr
        const length = data.users[userId].offsets.length

        if (currentI + length > randomI) {
          const res = await this.log.getMsg(channelId, userId, randomI - currentI)
          if (!res) {
            console.log(new Error('Failed to get a message when one was expected'))
            return "The logger unexpectedly didn't return a message"
          }
          if (res.type === CHAT || res.type === ACTION) {
            return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
          }
          return `Logger returned an invalid type: ${res.type}`
        } else currentI += length
      }
      if (currentI) {
        console.log(new Error('No message chosen'))
        return 'No message chosen?'
      }
      return 'There are no logged messages'
    }
  }
}
