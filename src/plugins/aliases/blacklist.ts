import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

const exp: Array<{options: PluginOptions, Instance: any}> = [
  {
    options: {
      type: 'command',
      id: 'blacklist',
      title: 'Blacklist',
      description: 'Forbids a user from using a command',
      default: {
        alias: ['?blacklist'],
        options: {
          userlvl: userlvls.mod,
        },
      },
      help: [
        'Forbid a user from using a command: {alias} <USER> <COMMAND>',
      ],
    },

    Instance: class implements PluginInstance {

      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib
      }

      public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
        if (!params[1]) return 'Define a user (param 1)'
        if (!params[2]) return 'Define a command name (param 2)'
        const aliasName = params[2].toLowerCase()
        const alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the blacklist of a command you are not permitted to use'
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'
          if (uid === channelId) return 'You cannot blacklist the broadcaster'
          if (this.l.isMod(channelId, params[1])) return 'You cannot blacklist a moderator'

          if (alias.blacklist && alias.blacklist.includes(uid)) return `${params[2]} is already blacklisted from using ${aliasName}`
          if (!alias.blacklist) alias.blacklist = []
          alias.blacklist.push(uid)
          return `Blacklisted ${params[1]} from using ${aliasName}`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global alias. Create copy
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the blacklist of a command you are not permitted to use'
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'

          // Because no channel alias was found we can create a new alias and delete it later if errors were found
          this.l.createAlias(channelId, aliasName, globalAlias)
          const alias = this.l.getAlias(channelId, aliasName)
          if (!alias) return 'Failed to create new alias?'
          if (!alias.blacklist) alias.blacklist = []
          alias.blacklist.push(uid)
          return `Blacklisted ${params[1]} from using ${aliasName}`
        }
        return 'Cannot find that command'
      }
    },
  },

  {
    options: {
      type: 'command',
      id: 'unblacklist',
      title: 'Unblacklist',
      description: 'Removes a user from a command\'s blacklist',
      default: {
        alias: ['?unblacklist'],
        options: {
          userlvl: userlvls.mod,
        },
      },
      help: [
        'Remove user from the blacklist of command: {alias} <user> <command>',
      ],
    },

    Instance: class implements PluginInstance {

      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib
      }

      public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
        if (!params[1]) return 'Define a user (param 1)'
        if (!params[2]) return 'Define a command (param 2)'
        const aliasName = params[2].toLowerCase()
        const alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the blacklist of a command you are not permitted to use'
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'
          if (!alias.blacklist || !alias.blacklist.includes(uid)) return `${params[1]} is not blacklisted from using ${aliasName}`
          alias.blacklist = alias.blacklist.filter(v => v !== uid)
          return `Removed ${params[1]} from ${aliasName}'s blacklist`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global aliases cant have white- or blacklists
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the blacklist of a command you are not permitted to use'
          return `${params[1]} is not blacklisted from using ${aliasName}`
        }
        return 'Cannot find that command'
      }
    },
  },
]

module.exports = exp
