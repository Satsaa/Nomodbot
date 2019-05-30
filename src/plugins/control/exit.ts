import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'exit',
  title: 'Exit',
  description: 'Exits the process',
  default: {
    alias: '$exit',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: [
    'Exit the process: {alias}',
  ],
  atUser: true,
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    process.exit()
    return 'Exit unsuccessful?'
  }
}
