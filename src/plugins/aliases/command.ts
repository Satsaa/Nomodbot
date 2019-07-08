import { exec as _exec } from 'child_process'
import util from 'util'

import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'


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
    'Add a command: {alias} add <new command> <plugin>',
    'Delete a command: {alias} del <command>',
    'Edit a command: {alias} edit <command> <PLUGIN>',
    'Copy a command: {alias} copy <command> <new command>',
    'Disable a command: {alias} disable <command>',
    'Enable or disable a command: {alias} enable|disable <command>',
    'Hide or unhide a command: {alias} hide|unhide <command>',
    'Modify the cooldowns of a command: {alias} set <command> cd|ucd <0-300>',
  ],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', 'add <!COMMAND> <PLUGIN>', this.callAdd)
    this.call = this.l.addCall(this, this.call, 'default', 'del <COMMAND>', this.callDelete)
    this.call = this.l.addCall(this, this.call, 'default', 'edit <command> <PLUGIN>', this.callEdit)
    this.call = this.l.addCall(this, this.call, 'default', 'copy <COMMAND> <!COMMAND>', this.callCopy)
    this.call = this.l.addCall(this, this.call, 'default', 'enable|disable <COMMAND>', this.callEnable)
    this.call = this.l.addCall(this, this.call, 'default', 'hide|unhide <COMMAND>', this.callHide)
    this.call = this.l.addCall(this, this.call, 'default', 'set <COMMAND> cd|ucd <0-300>', this.callSet)
  }

  public async callAdd(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName, pluginId]: ['add', string, string] = params

    const plugin = this.l.getPlugin(pluginId)
    if (!plugin) { return 'Invalid plugin' }
    if (plugin.type !== 'command') { return 'That plugin is not a command plugin' }

    const res = this.l.setAlias(channelId, aliasName, { ...plugin.default.options, target: plugin.id })
    if (res) { return `"${aliasName}" created` } else { return 'Command creation failed' }
  }

  public async callDelete(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName]: ['del', string] = params

    if (this.l.delAlias(channelId, aliasName)) { return 'Command successfully deleted' } else { return 'Command deletion failed' }
  }

  public async callEdit(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName, pluginId]: ['edit', string, string] = params

    const alias = this.l.getAlias(channelId, aliasName)
    if (!alias) return 'No command'

    const res = this.l.setAlias(channelId, pluginId, alias)
    if (res) { return `"${aliasName}" edited` } else { return 'Command edit failed' }
  }

  public async callCopy(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, sourceName, targetName]: ['copy', string, string] = params

    const alias = this.l.getAlias(channelId, sourceName)
    if (!alias) return 'No command'

    const res = this.l.setAlias(channelId, targetName, alias)
    if (res) { return `"${sourceName}" copied to "${targetName}"` } else { return 'Command copy failed' }
  }

  public async callEnable(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName]: ['enable' | 'disable', string] = params

    const enable = action === 'enable'
    const alias = this.l.getAlias(channelId, aliasName)
    if (!alias) return 'No command'
    if (enable ? !alias.disabled : alias.disabled) return `Already ${enable ? 'enabled' : 'disabled'}`

    const res = this.l.modAlias(channelId, aliasName, { disabled: enable ? undefined : true })
    if (res) return `"${aliasName.toLowerCase()}" ${action}d`
    else return `Command ${enable ? 'enabling' : 'disabling'} failed`
  }

  public async callHide(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName]: ['hide' | 'unhide', string] = params

    const hide = action === 'hide'
    const alias = this.l.getAlias(channelId, aliasName)
    if (!alias) return 'No command'
    if (hide ? alias.hidden : !alias.hidden) return `Already ${hide ? 'hidden' : 'unhidden'}`

    const res = this.l.modAlias(channelId, aliasName, { hidden: hide ? true : undefined })
    if (res) return `"${aliasName.toLowerCase()}" ${hide ? 'hidden' : 'unhidden'}`
    else return `Command ${hide ? 'hiding' : 'unhiding'} failed`
  }

  public async callSet(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName, key, cd]: ['set', string, 'cd' | 'ucd', number] = params

    switch (key) {
      case 'cd': {
        const alias = this.l.getAlias(channelId, aliasName)
        if (!alias) return 'No command'

        const res = this.l.modAlias(channelId, aliasName, { cooldown: cd || undefined })
        if (res) { return `Cooldown of "${aliasName}" set to ${this.l.u.plural(cd, 'second')}. The per-user cooldown is ${this.l.u.plural(alias.userCooldown || 0, 'second')}` } else { return 'Failed to change cooldown' }
      }
      case 'ucd': {
        const alias = this.l.getAlias(channelId, aliasName)
        if (!alias) return 'No command'

        const res = this.l.modAlias(channelId, aliasName, { userCooldown: cd || undefined })
        if (res) { return `User cooldown of "${aliasName}" set to ${this.l.u.plural(cd, 'second')}. The normal cooldown is ${this.l.u.plural(alias.cooldown || 0, 'second')}` } else { return 'Failed to change user cooldown' }
      }
      default:
        return `What the heck? Unknown key ${action}`
    }
  }
}
