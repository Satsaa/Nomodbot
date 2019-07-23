import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

type userlvlParam = undefined | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const options: PluginOptions = {
  type: 'command',
  id: 'commands',
  title: 'Commands',
  description: 'Displays enabled commands',
  default: {
    alias: ['?commands', '$aliases'],
    options: {
      cooldown: 30,
      userCooldown: 60,
    },
  },
  help: [
    'Display disabled commands: {alias} disabled [<0-10>]',
    'Display hidden commands: {alias} hidden [<0-10>]',
    'Display enabled commands: {alias} [<0-10>]',
  ],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'disabled [<0-10>]', this.callDisabled)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'hidden [<0-10>]', this.callHidden)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<0-10>]', this.callMain)
  }


  public async callDisabled(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, _userlvl]: ['disabled', userlvlParam] = params
    const userlvl = _userlvl === undefined ? userlvls.any : _userlvl // Don't show master commands by default

    const results = []
    const aliases = this.l.getAliases(channelId)
    if (!aliases) return 'No commands returned'
    for (const aliasName in aliases) {
      const alias = aliases[aliasName]
      if ((alias.userlvl || 0) === userlvl && !alias.hidden && alias.disabled) {
        results.push(aliasName)
      }
    }
    return `Disabled commands: ${this.l.u.commaPunctuate(results.sort())}`
  }

  public async callHidden(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, _userlvl]: ['hidden', userlvlParam] = params
    const userlvl = _userlvl === undefined ? userlvls.any : _userlvl // Don't show master commands by default

    const results = []
    const aliases = { ...this.l.getEnabledGlobalAliases(), ...this.l.getEnabledAliases(channelId) }
    for (const aliasName in aliases) {
      const alias = aliases[aliasName]
      if ((alias.userlvl || 0) === userlvl && alias.hidden && !alias.disabled) {
        results.push(aliasName)
      }
    }
    return `Hidden commands: ${this.l.u.commaPunctuate(results.sort())}`
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_userlvl]: [userlvlParam] = params
    const userlvl = _userlvl === undefined ? userlvls.any : _userlvl // Don't show master commands by default

    const results = []
    const aliases = { ...this.l.getEnabledGlobalAliases(), ...this.l.getEnabledAliases(channelId) }
    for (const aliasName in aliases) {
      const alias = aliases[aliasName]
      if ((alias.userlvl || 0) === userlvl && !alias.hidden && !alias.disabled) {
        results.push(aliasName)
      }
    }
    return `Commands: ${this.l.u.commaPunctuate(results.sort())}`
  }
}
