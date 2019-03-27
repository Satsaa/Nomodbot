import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'reload',
  name: 'Reload',
  description: 'Reloads the process',
  default: {
    alias: '$reload',
    options: {
      permissions: 10,
    },
  },
  help: '{alias}: Reloads the process',
}

export class Instance implements PluginInstance {

  private pluginLib: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.pluginLib = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    return 'Unimplemented'
  }
}
