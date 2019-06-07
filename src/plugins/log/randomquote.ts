import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'
import { ACTION, CHAT, LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'randomquote',
  title: 'RandomQuote',
  description: 'Shows a random message someone has sent in {channel}',
  default: {
    alias: ['?randomquote', '?rq'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Show a random message someone or user has sent: {alias} [<USER>] [<INDEX>]',
  ],
  requirePlugins: ['log'],
  noAtUser: true,
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (params[1]) { // User specific message
      let userIndex: number | undefined = userId
      let index = 0
      if (isNaN(+params[1])) {
        userIndex = await this.l.api.getId(params[1])
        if (!userIndex) return this.l.insertAtUser('Cannot find a user with that name', extra)
        const count = this.log.msgCount(channelId, userIndex)
        if (typeof count === 'undefined') return this.l.insertAtUser('Log data unavailable, extra) ', extra)
        index = isNaN(+params[2]) ?  this.l.u.randomInt(0, count) : +params[2]
      } else index = +params[1]

      const res = await this.log.getSmartIndexMsg(channelId, userIndex, index)
      if (!res) return this.l.insertAtUser('That user has no logged messages', extra)
      if (res.type === CHAT || res.type === ACTION) {
        return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
      }
      return `Logger returned an invalid type: ${res.type}`
    } else { // Any message
      const data = this.log.getData(channelId)
      if (!data) return this.l.insertAtUser('Log data unavailable', extra)

      const randomI = this.l.u.randomInt(0, data.messageCount - 1)
      let currentI = 0
      for (const uIdStr in data.users) {
        const userId = ~~uIdStr
        const length = data.users[userId].offsets.length

        if (currentI + length > randomI) {
          const res = await this.log.getMsg(channelId, userId, randomI - currentI)
          if (!res) {
            console.log(new Error('Failed to get a message when one was expected'))
            return this.l.insertAtUser("The logger unexpectedly didn't return a message", extra)
          }
          if (res.type === CHAT || res.type === ACTION) {
            return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
          }
          return this.l.insertAtUser(`Logger returned an invalid type: ${res.type}`, extra)
        } else currentI += length
      }
      if (currentI) {
        return this.l.insertAtUser('No message chosen?', extra)
      }
      return this.l.insertAtUser('There are no logged messages', extra)
    }
  }
}
