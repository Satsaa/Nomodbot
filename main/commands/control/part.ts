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

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, params: string[], me: boolean) {
    return await this.l.part(params.length === 1 ? channel : params.slice(1)) ? undefined : 'Server response timeout'
  }
}
