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

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, params: string[], me: boolean) {
    return Object.keys(this.l.getActiveAliases(channel)).sort().join(', ')
  }
}
