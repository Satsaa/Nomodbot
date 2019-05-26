import { PRIVMSG } from '../../main/client/parser'
import { CommandAlias, Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export = [
  {
    options: {
      type: 'command',
      id: 'permit',
      title: 'Permit',
      description: 'Gives a user permissions to use a command',
      default: {
        alias: ['?permit', '?whitelist'],
        options: {
          permissions: 6,
        },
      },
      help: [
        'Give user permissions to use command: {alias} <user> <command>',
      ],
    } as PluginOptions,

    Instance: class implements PluginInstance {

      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib
      }

      public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
        const aliasName = params[2].toLowerCase()
        const alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, tags.badges, {ignoreWhiteList: true})) return `You are not permitted to give permissions for ${aliasName}`
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'No user with that name'
          if (!alias.whitelist) alias.whitelist = []
          if (alias.blacklist && alias.blacklist.includes(uid)) return `${params[2]} is blacklisted from using ${aliasName}`
          if (alias.whitelist.includes(uid)) return `${params[1]} is already whitelisted for ${aliasName}`
          alias.whitelist.push(uid)
          return `Gave ${params[1]} permission to use ${aliasName}`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global alias. Create copy
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return `You are not permitted to give permissions for ${aliasName}`
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'No user with that name'
          // Because no channel alias was found we can create a new alias and delete it later if errors were found
          this.l.createAlias(channelId, aliasName, globalAlias)
          const alias = this.l.getAlias(channelId, aliasName)
          if (!alias) return 'Failed to create new alias?'
          if (!alias.whitelist) alias.whitelist = []
          alias.whitelist.push(uid)
          return `Gave ${params[1]} permission to use ${aliasName}`
        }
        return 'No command with that name'
      }
    },
  },

  {
    options: {
      type: 'command',
      id: 'unpermit',
      title: 'Unpermit',
      description: 'Removes a user\'s additional permissions to use a command',
      default: {
        alias: ['?permit', '?whitelist'],
        options: {
          permissions: 6,
        },
      },
      help: [
        'Remove user\'s additional permissions to use command: {alias} <user> <command>',
      ],
    } as PluginOptions,

    Instance: class implements PluginInstance {

      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib
      }

      public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
        const aliasName = params[2].toLowerCase()
        const alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, tags.badges, {ignoreWhiteList: true})) return `You are not permitted to use ${aliasName}`
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'No user with that name'
          if (!alias.whitelist) return `${params[1]} doesn't have additional permissions to use ${aliasName}`
          if (!alias.whitelist.includes(uid)) return `${params[1]} doesn't have additional permissions to use ${aliasName}`
          alias.whitelist = alias.whitelist.filter(listUid => listUid !== uid)
          return `Removed ${params[1]}'s additional permissions to use command ${aliasName}`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global alias. Create copy
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return `You are not permitted to use ${aliasName}`
          return `${params[1]} doesn't have additional permissions to use ${aliasName}`
        }
        return 'No command with that name'
      }
    },
  },
]
