import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'save',
  title: 'Save',
  description: 'Saves a file',
  default: {
    alias: '$save',
    options: {
      userlvl: Userlvl.master,
    },
  },
  help: [
    'Save all loaded files: {alias}',
    'Save the file in \\{channel}\\name: {alias} <name>',
    'Save the file in \\subType\\name: {alias} <subType> <name>',
  ],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<subType> <name>', this.callGlobal)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<name>', this.callLocal)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callAll)
  }

  public async callGlobal(channelId: number, userId: number, params: any, extra: Extra) {
    const [subType, name]: [string, string] = params

    if (!this.l.getData(subType, name)) return `\\${subType}\\${name} is not loaded`
    this.l.saveData(subType, name, false)
    return `Saved \\${subType}\\${name}`
  }

  public async callLocal(channelId: number, userId: number, params: any, extra: Extra) {
    const [name]: [string] = params

    const subType = channelId

    if (!this.l.getData(subType, name)) return `\\${subType}\\${name} is not loaded`
    this.l.saveData(subType, name, false)
    return `Saved \\${subType}\\${name}`
  }

  public async callAll(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params
    this.l.saveAllSync()
    return 'Saved all data'
  }
}
