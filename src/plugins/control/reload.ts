import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  name: 'reload',
  title: 'Reload',
  description: 'Reloads a file',
  default: {
    alias: '$reload',
    options: {
      permissions: 10,
    },
  },
  help: ['Reload the file in \\subType | {channel}\\name: {alias} [subType] <name>'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    let subType = ~~params[1]
    let name = params[2]
    if (!params[2]) { // Channel specific with single param
      subType = channelId
      name = params[1]
    }
    if (!this.l.getData(subType, name)) return ` \\${subType}\\${name} is not loaded`
    this.l.reload(subType, name)
    return `Reloaded \\${subType}\\${name}`
  }
}
