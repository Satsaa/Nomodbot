import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'save',
  name: 'Save',
  description: 'Saves the process',
  default: {
    alias: '$save',
    options: {
      permissions: 10,
    },
  },
  help: '{alias}: saves the process',
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
