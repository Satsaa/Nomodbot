import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'reload',
  title: 'Reload',
  description: 'Reloads a file',
  default: {
    alias: '$reload',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: [
    'Reload the file in \\subType\\name: {alias} <subType> <name>',
    'Reload the file in \\{channel}\\name: {alias} <name>',
  ],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '<subType> <name>', this.callGlobal)
    this.call = this.l.addCall(this, this.call, 'default', '<name>', this.callLocal)
  }

  public async callGlobal(channelId: number, userId: number, params: any, extra: Extra) {
    const [subType, name]: [string, string] = params

    if (!this.l.getData(subType, name)) return ` \\${subType}\\${name} is not loaded`
    this.l.reload(subType, name)
    return `Reloaded \\${subType}\\${name}`
  }

  public async callLocal(channelId: number, userId: number, params: any, extra: Extra) {
    const [name]: [string] = params

    const subType = channelId
    if (!this.l.getData(subType, name)) return ` \\${subType}\\${name} is not loaded`
    this.l.reload(subType, name)
    return `Reloaded \\${subType}\\${name}`
  }
}
