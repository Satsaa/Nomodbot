import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'totallines',
  title: 'TotalLines',
  description: 'Shows the total amount of messages sent in the current channel',
  default: {
    alias: '?totallines',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Show the total messages sent in {channel}: {alias}'],
  requirePlugins: ['log'],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension

    this.call = this.l.addCall(this, this.call, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    const data = this.log.getData(channelId)
    if (!data) return 'Log data unavailable'
    return `A total of ${this.l.u.plural(data.events.chat.eventCount, 'message has', 'messages have')} been sent`
  }
}
