import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/PluginLib'

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
  help: ['Exit the process: {alias}'],
}

export class Instance implements PluginInstance {
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (process.send) {
      process.send({ cmd: 'AUTO_RESTART', val: false })
      process.send({ cmd: 'AUTO_RESTART_NEXT', val: false })
    }
    process.exit()
    return 'Exit unsuccessful?'
  }
}
