import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

import { exec as _exec} from 'child_process'
import util from 'util'
const exec = util.promisify(_exec)

export const options: PluginOptions = {
  type: 'command',
  id: 'command',
  title: 'Command',
  description: 'Do operations on commands',
  default: {
    alias: '?command',
    options: {
      userlvl: userlvls.mod,
    },
  },
  help: [
    'Add a command: {alias} add <!COMMAND> <PLUGIN>',
    'Delete a command: {alias} delete <COMMAND>',
    'Edit a command: {alias} edit <COMMAND> <PLUGIN>',
    'Copy a command: {alias} copy <COMMAND> <!COMMAND>',
    'Disable a command: {alias} disable <COMMAND>',
    'Enable a command: {alias} enable <COMMAND>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    switch (params[1]) {
      case 'add': {
        const alias = this.l.getAlias(channelId, params[2])
        if (alias) return 'Already command'
        const plugin = this.l.getPlugin(params[3])
        if (!plugin || plugin.type !== 'command') return 'Invalid plugin'
        this.l.setAlias(channelId, params[2], { ...plugin.default.options, target: plugin.id })
        break
      }
      case 'delete': {
        if (this.l.getAlias(channelId, params[2])) {
          const alias = this.l.getAlias(channelId, params[2])
        }
        break
      }
      case 'edit': {
        break
      }
      case 'copy': {
        break
      }
      case 'disable': {
        break
      }
      case 'enable': {
        break
      }
    }
    return
  }
}
