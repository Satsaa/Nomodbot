import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'join',
  title: 'Join',
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

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    if (!params[1]) return 'Define a channel or multiple (params 1+)'
    const uid = await this.l.api.getId(params[1])
    if (!uid) return 'Cannot get the user ID'
    return await this.l.join([uid]) ? undefined : 'Server response timeout'
  }
}
