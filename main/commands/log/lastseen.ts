import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'
import { LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'lastseen',
  name: 'LastSeen',
  description: 'Shows when a user sent their last message',
  default: {
    alias: ['?seen', '?lastseen'],
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: [
    'Show when you or user sent their last message: {alias} [<user>]',
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
    const uid = params[1] ? await this.l.api.getId(params[1]) : userId
    if (!uid) return "That user doesn't exist"

    const user = this.log.getUser(channelId, uid)
    if (!user) return 'That user has not been seen here before'

    if (!user.time) return 'That user has not sent any messages'

    const length = this.log.msgCount(channelId, uid)
    if (!length) return 'Bad length returned'
    if (length <= 1) {
      if (uid === userId) return `@${userstate['display-name']} You have not sent a message before`
      else return `${this.l.api.getDisplay(uid)} has not sent a message before`
    }
    const ms = this.log.getTime(channelId, uid, uid === userId ? length - 1 : length)
    if (!ms) return 'Bad time returned'

    if (uid === userId) return `@${userstate['display-name']} You were seen ${this.l.u.timeSince(ms, 1, true)} ago`
    else return `${await this.l.api.getDisplay(uid)} was seen ${this.l.u.timeSince(ms, 1, true)} ago`
  }
}
