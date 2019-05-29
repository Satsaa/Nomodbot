import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export = [
  {
    options: {
      type: 'command',
      id: 'whitelist',
      title: 'Whitelist',
      description: 'Whitelists a user to use a command',
      default: {
        alias: ['?whitelist'],
        options: {
          userlvl: userlvls.mod,
        },
      },
      help: [
        'Whitelist user to use command: {alias} <user> <command>',
      ],
    } as PluginOptions,

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
          if (!this.l.isPermitted(alias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the whitelist of a command you are not permitted to use'
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'
          if (!alias.whitelist) alias.whitelist = []
          if (alias.blacklist && alias.blacklist.includes(uid)) return `${params[2]} is blacklisted from using ${aliasName}`
          if (alias.whitelist.includes(uid)) return `${params[1]} is already whitelisted to use ${aliasName}`
          alias.whitelist.push(uid)
          return `Added ${params[1]} to the whitelist of ${aliasName}`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global alias. Create copy
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the whitelist of a command you are not permitted to use'
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'
          // Because no channel alias was found we can create a new alias and delete it later if errors were found
          const alias = this.l.createAlias(channelId, aliasName, globalAlias)
          if (!alias) return 'Failed to create new alias?'
          if (!alias.whitelist) alias.whitelist = []
          alias.whitelist.push(uid)
          return `Added ${params[1]} to the whitelist of ${aliasName}`
        }
        return 'Cannot find that command'
      }
    },
  },

  {
    options: {
      type: 'command',
      id: 'unwhitelist',
      title: 'Unwhitelist',
      description: 'Removes a user from the whitelist of a command',
      default: {
        alias: ['?unwhitelist'],
        options: {
          userlvl: userlvls.mod,
        },
      },
      help: [
        'Remove user from the whitelist of command: {alias} <user> <command>',
      ],
    } as PluginOptions,

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
          if (!this.l.isPermitted(alias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the whitelist of a command you are not permitted to use'
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'
          if (!alias.whitelist || !alias.whitelist.includes(uid)) return `${params[1]} is not whitelisted for ${aliasName}`
          alias.whitelist = alias.whitelist.filter(listUid => listUid !== uid)
          return `Removed ${params[1]} from the whitelist of ${aliasName}`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global alias. Cannot have a whitelist
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return 'You cannot edit the whitelist of a command you are not permitted to use'
          return `${params[1]} is not whitelisted for ${aliasName}`
        }
        return 'Cannot find that command'
      }
    },
  },
]
