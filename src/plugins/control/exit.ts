import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
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
  help: ['Exit the process: {alias}'],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    if (process.send) {
      process.send({ cmd: 'AUTO_RESTART', val: false })
      process.send({ cmd: 'AUTO_RESTART_NEXT', val: false })
    }
    process.exit()
    return 'Exit unsuccessful?'
  }
}
