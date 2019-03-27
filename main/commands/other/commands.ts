import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'commands',
  name: 'Commands',
  description: 'Displays enabled commands',
  default: {
    alias: '?commands',
    options: {
      cooldown: 30,
      userCooldown: 180,
    },
  },
  help: '{alias}: Display enabled commands',
}

export class Instance implements PluginInstance {

  private pluginLib: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.pluginLib = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    return Object.keys(this.pluginLib.getActiveAliases(channel)).join(', ')
  }
}
