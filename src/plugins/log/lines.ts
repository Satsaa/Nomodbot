import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { LogExtension } from './log'
import { BanLinesExtension } from './banlines'

export const options: PluginOptions = {
  type: 'command',
  id: 'lines',
  title: 'Lines',
  description: 'Shows how many messages a user has sent',
  default: {
    alias: ['?lines', '?linecount'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Show the total amount of messages sent by you or user: {alias} [<USER>]'],
  requirePlugins: ['log', 'banlines'],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private log: LogExtension
  private bans: BanLinesExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension
    this.bans = this.l.ext.banlines as BanLinesExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<USER>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_targetId]: [number | undefined] = params
    const targetId = _targetId || userId

    if (!this.log.getUser(channelId, targetId)) return 'That user has not been seen here before'

    const res = this.log.eventCount(channelId, targetId, 'chat')
    if (res === undefined) return 'Log data is unavailable at the moment'

    const banned = this.bans.isBanned(channelId, targetId)
    if (banned) {
      return extra.words[1]
        ? `${await this.l.api.getDisplay(targetId)} has been banned from appearing in line count commands`
        : 'You have been banned from appearing in line count commands'
    }

    return extra.words[1]
      ? `${await this.l.api.getDisplay(targetId)} has sent ${this.l.u.plural(res, 'message')}`
      : `You have sent ${this.l.u.plural(res, 'message')}`
  }
}
