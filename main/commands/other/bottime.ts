import { PluginInstance, PluginOptions } from '../../src/Commander'
import * as u from '../../src/lib/util'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'bottime',
  name: 'Bottime',
  description: 'Display how long the bot has been running',
  default: {
    alias: '?bottime',
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: '{alias}: Display bot uptime',
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, params: string[], me: boolean) {
    return `The bot has been running for ${u.plural(Math.floor(process.uptime()), 'second')}`
  }
}
