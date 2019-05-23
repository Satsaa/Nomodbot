import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'
import { LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  name: 'firstseen',
  title: 'FirstSeen',
  description: 'Shows when a user sent their first message',
  default: {
    alias: '?firstseen',
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: [
    'Show when you or user sent their first message: {alias} [<user>]',
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

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    const uid = params[1] ? await this.l.api.getId(params[1]) : userId
    if (!uid) return "That user doesn't exist"

    const user = this.log.getUser(channelId, uid)
    if (!user) return 'That user has not been seen here before'

    if (!user.times[0]) return 'That user has not sent any messages'

    if (uid === userId) return `@${userstate['display-name']} You were first seen ${this.l.u.dateString(user.times[0] * 1000)}`
    else return `${await this.l.api.getDisplay(uid)} was first seen ${this.l.u.dateString(user.times[0] * 1000)}`
  }
}
