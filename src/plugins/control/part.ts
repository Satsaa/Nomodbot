import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'part',
  title: 'Part',
  description: 'Leaves a channel',
  default: {
    alias: '$part',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: [
    'Leave this channel or channels: {alias} [<CHANNELS...>]',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (!params[1]) return await this.l.part([channelId]) ? undefined : 'Server response timeout'
    const uid = await this.l.api.getId(params[1])
    if (!uid) return 'Cannot find that user'
    return await this.l.part([uid]) ? undefined : 'Server response timeout'
  }
}
