import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
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
    'Save the file in \\{channel}\\name: {alias} <name>',
    'Save the file in \\subType\\name: {alias} <subType> <name>',
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
    let subType = params[1]
    let name = params[2]
    if (!params[2]) { // Channel specific with single param
      subType = channel
      name = params[1]
    }
    if (!this.l.getData(subType, name)) return `\\${subType}\\${name} is not loaded`
    this.l.saveData(subType, name, false)
    return `Saved \\${subType}\\${name}`
  }
}
