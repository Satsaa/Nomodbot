import { IrcMessage, PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'save',
  title: 'Save',
  description: 'Saves a file',
  default: {
    alias: '$save',
    options: {
      permissions: 10,
    },
  },
  help: [
    'Save all loaded files: {alias}',
    'Save the file in \\{channel}\\name: {alias} <name>',
    'Save the file in \\subType\\name: {alias} <subType> <name>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (!params[1]) {
      this.l.saveAllSync()
      return 'Saved all data'
    }
    let subType = ~~params[1]
    let name = params[2]
    if (!params[2]) { // Channel specific with single param
      subType = channelId
      name = params[1]
    }
    if (!this.l.getData(subType, name)) return `\\${subType}\\${name} is not loaded`
    this.l.saveData(subType, name, false)
    return `Saved \\${subType}\\${name}`
  }
}
