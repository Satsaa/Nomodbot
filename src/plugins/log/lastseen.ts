import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'
import { LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'lastseen',
  title: 'LastSeen',
  description: 'Shows when a user sent their last message',
  default: {
    alias: ['?seen', '?lastseen'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Show when you or user sent their last message: {alias} [<user>]',
  ],
  requirePlugins: ['log'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const targetId = params[1] ? await this.l.api.getId(params[1]) : userId
    if (!targetId) return "That user doesn't exist"

    const user = this.log.getUser(channelId, targetId)
    if (!user) return 'That user has not been seen here before'

    if (!user.time) return 'That user has not sent any messages'

    const length = this.log.msgCount(channelId, targetId)
    if (!length) return 'Bad length returned'
    if (length <= 1) {
      if (targetId === userId) return `@${tags['display-name']} You have not sent a message before`
      else return `${this.l.api.getDisplay(targetId)} has not sent a message before`
    }
    const ms = this.log.getTime(channelId, targetId, length)
    if (!ms) return 'Bad time returned'

    if (targetId === userId) return `@${tags['display-name']} You were seen ${this.l.u.timeSince(ms, 1, true)} ago`
    else return `${await this.l.api.getDisplay(targetId)} was seen ${this.l.u.timeSince(ms, 1, true)} ago`
  }
}
