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
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callMain)
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
