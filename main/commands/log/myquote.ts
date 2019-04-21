import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'
import { ACTION, CHAT, LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'myquote',
  name: 'MyQuote',
  description: 'Shows a random chat message a user has send in the past',
  default: {
    alias: '?myquote',
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: [
    'Show a random or specific message you have sent: {alias} [<index>]',
    'Show a random or specific message user has sent: {alias} <user> [<index>]',
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
    let uid: number = userId
    let index = 0
    if (params[1]) {
      if (isNaN(+params[1])) {
        uid = (await this.l.api.getId(params[1])) || userId
        const count = this.log.msgCount(channelId, uid) || 0
        if (typeof count === 'undefined') return 'Log data is unavailable at the moment'
        index = isNaN(+params[2]) ?  this.l.u.randomInt(0, count) : +params[2]
      } else {
        index = +params[1]
      }
    } else index = this.l.u.randomInt(0, this.log.msgCount(channelId, userId) || 0)

    const res = await this.log.getSmartIndexMsg(channelId, uid, index)
    if (!res) return 'That user has no logged messages'
    if (res.type === CHAT || res.type === ACTION) {
      return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
    }
    return `Logger returned an invalid type: ${res.type}`
  }
}
