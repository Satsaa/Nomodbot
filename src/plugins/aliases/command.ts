import { exec as _exec } from 'child_process'
import util from 'util'

import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'


const exec = util.promisify(_exec)

export const options: PluginOptions = {
  type: 'command',
  id: 'command',
  title: 'Command',
  description: 'Do operations on commands',
  default: {
    alias: '?command',
    options: { userlvl: userlvls.mod },
  },
  help: [
    'Add a command: {alias} add <!COMMAND> <PLUGIN>',
    'Delete a command: {alias} delete <COMMAND>',
    'Edit a command: {alias} edit <command> <PLUGIN>',
    'Copy a command: {alias} copy <COMMAND> <!COMMAND>',
    'Disable a command: {alias} disable <COMMAND>',
    'Enable or disable a command: {alias} enable|disable <COMMAND>',
    'Hide or unhide a command: {alias} hide|unhide <COMMAND>',
    'Modify the cooldowns of a command: {alias} set <COMMAND> cd|ucd <0-300>',
    'Display the cooldowns of a command: {alias} set <COMMAND> cd|ucd', // !!!
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
        const plugin = this.l.getPlugin(params[3])
        if (!plugin) { return 'Invalid plugin' }
        if (plugin.type !== 'command') { return 'That plugin is not a command plugin' }

        const res = this.l.setAlias(channelId, params[2], { ...plugin.default.options, target: plugin.id })
        if (res) { return `"${params[2].toLowerCase()}" created` } else { return 'Command creation failed' }
      }
      case 'delete': {
        const aliasName = params[2]
        if (this.l.delAlias(channelId, aliasName)) { return 'Command successfully deleted' } else { return 'Command deletion failed' }
      }
      case 'edit': {
        const alias = this.l.getAlias(channelId, params[2])
        if (!alias) return 'No command'

        const res = this.l.setAlias(channelId, params[3], alias)
        if (res) { return `"${params[2].toLowerCase()}" edited` } else { return 'Command edit failed' }
      }
      case 'copy': {
        const alias = this.l.getAlias(channelId, params[2])
        if (!alias) return 'No command'

        const res = this.l.setAlias(channelId, params[3], alias)
        if (res) { return `"${params[2].toLowerCase()}" copied to "${params[3].toLowerCase()}"` } else { return 'Command copy failed' }
      }
      case 'disable': {
        const alias = this.l.getAlias(channelId, params[2])
        if (!alias) return 'No command'
        if (alias.disabled) return 'Already disabled'

        const res = this.l.modAlias(channelId, params[3], { disabled: true })
        if (res) { return `"${params[2].toLowerCase()}" disabled` } else { return 'Command copy failed' }
      }
      case 'enable': {
        const alias = this.l.getAlias(channelId, params[2])
        if (!alias) return 'No command'
        if (!alias.disabled) return 'Already enabled'

        const res = this.l.modAlias(channelId, params[3], { disabled: undefined })
        if (res) { return `"${params[2].toLowerCase()}" enabled` } else { return 'Command enabling failed' }
      }
      case 'hide': {
        const alias = this.l.getAlias(channelId, params[2])
        if (!alias) return 'No command'
        if (alias.disabled) return 'Already hidden'

        const res = this.l.modAlias(channelId, params[3], { hidden: true })
        if (res) { return `"${params[2].toLowerCase()}" hidden` } else { return 'Command hiding failed' }
      }
      case 'unhide': {
        const alias = this.l.getAlias(channelId, params[2])
        if (!alias) return 'No command'
        if (!alias.disabled) return 'Already unhidden'

        const res = this.l.modAlias(channelId, params[3], { hidden: undefined })
        if (res) { return `"${params[2].toLowerCase()}" unhidden` } else { return 'Command unhiding failed' }
      }
      case 'set': {
        switch (params[3]) {
          case 'cd': {
            const cd = ~~params[4],
                  alias = this.l.getAlias(channelId, params[2])
            if (!alias) return 'No command'

            const res = this.l.modAlias(channelId, params[2], { cooldown: cd || undefined })
            if (res) { return `Cooldown of "${params[2].toLowerCase()}" set to ${this.l.u.plural(cd, 'second')}. The user cooldown is ${this.l.u.plural(alias.userCooldown || 0, 'second')}` } else { return 'Failed to change cooldown' }
          }
          case 'ucd': {
            const cd = ~~params[4],
                  alias = this.l.getAlias(channelId, params[2])
            if (!alias) return 'No command'

            const res = this.l.modAlias(channelId, params[2], { userCooldown: cd || undefined })
            if (res) { return `User cooldown of "${params[2].toLowerCase()}" set to ${this.l.u.plural(cd, 'second')}. The normal cooldown is ${this.l.u.plural(alias.cooldown || 0, 'second')}` } else { return 'Failed to change user cooldown' }
          }
        }
      }
    }
    return undefined
  }
}
