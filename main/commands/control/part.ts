import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'part',
  name: 'Part',
  description: 'Leaves a channel',
  default: {
    alias: '$part',
    options: {
      permissions: 10,
    },
  },
  help: '{alias} <channels...>: Leave channels',
}

export class Instance implements PluginInstance {

  private pluginLib: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.pluginLib = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    const words = message.split(' ')
    return await this.pluginLib.part(words.length === 1 ? channel : words.slice(1)) ? undefined : 'Server response timeout'
  }
}
