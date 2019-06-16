import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'join',
  title: 'Join',
  description: 'Joins a channel',
  default: {
    alias: '$join',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: [
    'Join channels: {alias} <CHANNELS...>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (!params[1]) return 'Define a channel or multiple (params 1+)'
    const uid = await this.l.api.getId(params[1])
    if (!uid) return 'Cannot find that user'
    return await this.l.join([uid]) ? `Joined ${await this.l.api.getDisplay(uid)}` : 'Server response timeout'
  }
}
