import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'join',
  name: 'Join',
  description: 'Joins a channel',
  default: {
    alias: '$join',
    options: {
      permissions: 10,
    },
  },
  help: '{alias} <channels...>: Join channels',
}

export class Instance implements PluginInstance {

  private pluginLib: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.pluginLib = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    const words = message.split(' ')
    return await this.pluginLib.join(words.slice(1)) ? undefined : 'Server response timeout'
  }
}
