import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'bottime',
  title: 'Bottime',
  description: 'Display how long the bot has been running',
  default: {
    alias: '?bottime',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Display bot uptime: {alias}'],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    return `The bot has been running for ${this.l.u.timeDuration(process.uptime() * 1000, 2)}`
  }
}
