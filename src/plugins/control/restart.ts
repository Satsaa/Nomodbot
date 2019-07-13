import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'restart',
  title: 'Restart',
  description: 'Restarts the process if possible',
  default: {
    alias: '$restart',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: ['Restart the process if possible: {alias}'],
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

    if (!process.send) return 'Process manager is not available'

    process.send({ cmd: 'AUTO_RESTART_NEXT', val: true })
    process.send({ cmd: 'PUSH_ARGS', val: ['-j', `${channelId}:Restarted`] })

    process.exit()
    return 'Exit unsuccessful?'
  }
}