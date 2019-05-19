import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

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

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    if (!params[1]) return await this.l.part([channelId]) ? undefined : 'Server response timeout'
    const uid = await this.l.api.getId(params[1])
    if (!uid) return 'Cannot get the user ID'
    return await this.l.part([uid]) ? undefined : 'Server response timeout'
  }
}
