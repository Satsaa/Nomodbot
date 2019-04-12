import { IrcMessage } from '../../src/client/parser'
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
  help: ['Exit the process: {alias}'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    process.exit()
    if (userstate.peter) return
    return 'Exit unsuccessful?'
  }
}
