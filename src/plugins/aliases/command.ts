import { exec as _exec } from 'child_process'
import util from 'util'

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
    'Copy a command: {alias} copy <command> <new command>',
    'Delete a command: {alias} del <command>',
    'Edit a command: {alias} edit <command> <PLUGIN>',
    'Rename a command: {alias} edit <command> <!command>',
    'Disable a command: {alias} disable <command>',
    'Enable or disable a command: {alias} enable|disable <command>',
    'Hide or unhide a command: {alias} hide|unhide <command>',
    'Modify the cooldowns of a command: {alias} set <command> cd|ucd <0-300>',
    'Get a stat or all stats of command: {alias} get <command> cd|ucd',
  ],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'add <!COMMAND> <PLUGIN>', this.callAdd)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'del <COMMAND>', this.callDelete)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'edit <COMMAND> <PLUGIN>', this.callEdit)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'rename <COMMAND> <!COMMAND>', this.callRename)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'copy <COMMAND> <!COMMAND>', this.callCopy)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'enable|disable <COMMAND>', this.callEnable)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'hide|unhide <COMMAND>', this.callHide)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'set <COMMAND> cd|ucd <0-300>', this.callSet)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'get <COMMAND> [blacklist|bl|cd|cooldown|disabled|enabled|group|hidden|plugin|ucd|userCooldown|ul|userlevel|userlvl|whitelist|wl]', this.callGet)
  }

  public async callAdd(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName, pluginId]: ['add', string, string] = params

    const plugin = this.l.getPlugin(pluginId)
    if (!plugin) { return 'Invalid plugin' }
    if (plugin.type !== 'command') { return 'That plugin is not a command plugin' }

    const res = this.l.setAlias(channelId, aliasName, { ...plugin.default.options, target: plugin.id })
    if (res) return `"${aliasName}" created`
    else return 'Command creation failed'
  }

  public async callDelete(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName]: ['del', string] = params

    if (this.l.delAlias(channelId, aliasName)) return 'Command successfully deleted'
    else return 'Command deletion failed'
  }

  public async callEdit(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName, pluginId]: ['edit', string, string] = params

    const alias = this.l.getAlias(channelId, aliasName)
    if (!alias) return 'No command'

    const res = this.l.setAlias(channelId, pluginId, alias)
    if (res) return `"${aliasName}" edited`
    else return 'Command edit failed'
  }

  public async callCopy(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, sourceName, targetName]: ['copy', string, string] = params

    const alias = this.l.getAlias(channelId, sourceName)
    if (!alias) return 'No command'

    const res = this.l.setAlias(channelId, targetName, alias)
    if (res) return `"${sourceName}" copied to "${targetName}"`
    else return 'Command copy failed'
  }

  public async callRename(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, sourceAlias, targetAlias]: ['rename', string, string] = params

    const alias = this.l.getAlias(channelId, sourceAlias)
    if (!alias) return 'No command'

    if (!this.l.setAlias(channelId, targetAlias, alias)) return 'Command copy failed'

    if (!this.l.delAlias(channelId, sourceAlias)) return 'Source command delete failed'
    else return `${sourceAlias} renamed to ${targetAlias}`
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
        if (res) return `Cooldown of ${aliasName} set to ${this.l.u.plural(cd, 'second')}. The per-user cooldown is ${this.l.u.plural(alias.userCooldown || 0, 'second')}`
        else return 'Failed to change cooldown'
      }
      case 'ucd': {
        const alias = this.l.getAlias(channelId, aliasName)
        if (!alias) return 'No command'

        const res = this.l.modAlias(channelId, aliasName, { userCooldown: cd || undefined })
        if (res) return `User cooldown of ${aliasName} set to ${this.l.u.plural(cd, 'second')}. The global cooldown is ${this.l.u.plural(alias.cooldown || 0, 'second')}`
        else return 'Failed to change user cooldown'
      }
      default:
        return `What the heck? Unknown key ${action}`
    }
  }

  public async callGet(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName, key]: ['set', string, 'blacklist' | 'bl' | 'cd' | 'cooldown' | 'disabled' | 'enabled' | 'group' | 'hidden' | 'plugin' | 'ucd' | 'userCooldown' | 'ul' | 'userlevel' | 'userlvl' | 'whitelist' | 'wl' | undefined] = params

    const alias = this.l.getAlias(channelId, aliasName)
    if (!alias) return 'No command'
    switch (key) {
      case 'bl':
      case 'blacklist': {
        if (!alias.blacklist || !alias.blacklist.length) return `${aliasName} has no blacklist entries`
        return `Blacklisted users for ${aliasName}: ${this.l.u.commaPunctuate(alias.blacklist)}`
      }
      case 'cd':
      case 'cooldown': {
        const cd = alias.cooldown || 0
        return `${aliasName} has a cooldown of ${this.l.u.plural(cd, `${cd} second`)}}`
      }
      case 'enabled':
      case 'disabled': {
        return `${aliasName} is ${alias.disabled ? 'disabled' : 'enabled'}}`
      }
      case 'group': {
        return `${aliasName} is in the group ${alias.group || 'default'}}`
      }
      case 'hidden': {
        return `${aliasName} is ${alias.hidden ? 'hidden' : 'not hidden'}}`
      }
      case 'plugin': {
        return `${aliasName} is a command of ${alias.target}}`
      }
      case 'ucd':
      case 'userCooldown': {
        const ucd = alias.userCooldown || 0
        return `${aliasName} has a user cooldown of ${this.l.u.plural(ucd, `${ucd} second`)}}`
      }
      case 'ul':
      case 'userlvl':
      case 'userlevel': {
        const lvl = alias.userlvl || 0
        return `${aliasName} has a userlevel of ${lvl}/${this.l.userlvlString(lvl) || 'unknown'}}`
      }
      case 'wl':
      case 'whitelist': {
        if (!alias.whitelist || !alias.whitelist.length) return `${aliasName} has no whitelist entries`
        return `Whitelisted users for ${aliasName}: ${this.l.u.commaPunctuate(alias.whitelist)}`
      }
      default:
        return `What the heck? Unknown key ${action}`
    }
  }
}
