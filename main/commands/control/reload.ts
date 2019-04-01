import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'reload',
  name: 'Reload',
  description: 'Reloads a file',
  default: {
    alias: '$reload',
    options: {
      permissions: 10,
    },
  },
  help: ['Reload the file in \\type\\subType | channel\\name: {alias} <\'static\' | \'dynamic\'> [subType] <name>'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
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
    if (!this.l.getData(type, subType, name)) return ` \\${type}\\${subType}\\${name} is not loaded`
    this.l.reload(type, subType, name)
    return `Reloaded \\${type}\\${subType}\\${name}`
  }
}
