import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'exit',
  name: 'Exit',
  description: 'Exits the process',
  default: {
    alias: '$exit',
    options: {
      permissions: 10,
    },
  },
  help: '{alias}: Exit the process',
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, params: string[], me: boolean) {
    process.exit()
    return 'Exit unsuccessful?'
  }
}
