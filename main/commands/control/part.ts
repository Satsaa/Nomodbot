import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
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
  help: [
    'Leave channels: {alias} <channels...>',
    'Leave {channel}: {alias}',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    let _channel = params[1] ? params.slice(1) : channel
    if (!_channel.includes('#')) _channel = '#' + _channel
    return await this.l.part(_channel) ? undefined : 'Server response timeout'
  }
}
