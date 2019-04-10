import { IrcMessage } from '../../src/client/parser'
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
  help: ['Join channels: {alias} <channels...>'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    if (!params[1]) return 'Define a channel or multiple (param 1+)'
    if (!params[1].includes('#')) params[1] = '#' + params[1]
    return await this.l.join(params.slice(1)) ? undefined : 'Server response timeout'
  }
}
