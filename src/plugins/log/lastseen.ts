import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { LogExtension } from './log'

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
  help: ['Show when you or user sent their last message: {alias} [<USER>]'],
  requirePlugins: ['log'],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension

    this.call = this.l.addCall(this, this.call, 'default', '[<USER>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_targetId]: [number | undefined] = params
    const targetId = _targetId || userId

    const self = targetId === userId
    const display = extra.words[1] ? await this.l.api.getDisplay(targetId) : extra.irc.tags['display-name']

    if (!this.log.getData(channelId)) return 'Log data unavailable'

    if (!this.log.getUser(channelId, targetId)) return `${targetId === userId ? 'You have' : `${display} has`} not been seen here before`

    const length = this.log.msgCount(channelId, targetId)
    if (!length) return 'Bad length returned'
    if (length <= 1) return `${targetId === userId ? 'You have' : `${display} has`} no logged messages`

    const ms = this.log.getTime(channelId, targetId, self ? length > 0 ? length - 1 : length : length)
    if (!ms) return 'Bad time returned'

    const since = this.l.u.timeSince(ms, 1, true)
    if (targetId === userId) return `You were seen ${since} ago`
    else return `${display} was seen ${since} ago`
  }
}
