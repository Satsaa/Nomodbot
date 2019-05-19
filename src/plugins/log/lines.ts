import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'
import { LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'lines',
  name: 'Lines',
  description: 'Shows how many messages a user has sent',
  default: {
    alias: '?lines',
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: [
    'Show the total amount of messages sent by you or user: {alias} [<user>]',
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

    if (!this.log.getUser(channelId, uid)) return 'That user has not been seen here before'

    const res = this.log.msgCount(channelId, uid)
    if (typeof res === 'undefined') return 'Log data is unavailable at the moment'

    return params[1]
      ? `${await this.l.api.getDisplay(uid) || 'UID:' + uid} has sent ${this.l.u.plural(res, 'message')}`
      : `@${userstate['display-name']} You have sent ${this.l.u.plural(res, 'message')}`
  }
}
