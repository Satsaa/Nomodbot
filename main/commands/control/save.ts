import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'save',
  name: 'Save',
  description: 'Saves a file',
  default: {
    alias: '$save',
    options: {
      permissions: 10,
    },
  },
  help: [
    'Save all loaded files: {alias} all',
    'Save the file in \\type\\{channel}\\name: {alias} <\'static\' | \'dynamic\'> <name>',
    'Save the file in \\type\\subType\\name: {alias} <\'static\' | \'dynamic\'> <subType> <name>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    if (params[1].toLowerCase() === 'all') {
      this.l.saveAllSync()
      return 'Saved all data'
    }
    if (!this.l.DATATYPES.includes(params[1] as PluginLibrary['DATATYPES'][number])) {
      return `Param 1 must be of type ${this.l.DATATYPES.join(' | ')}`
    }
    const type = params[1] as PluginLibrary['DATATYPES'][number]
    let subType = params[2]
    let name = params[3]
    if (!params[3]) { // If only 2 params
      subType = channel
      name = params[2]
    }
    if (!this.l.getData(type, subType, name)) return `\\${type}\\${subType}\\${name} is not loaded`
    this.l.saveData(type, subType, name, false)
    return `Saved \\${type}\\${subType}\\${name}`
  }
}
