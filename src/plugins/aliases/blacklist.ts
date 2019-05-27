import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export = [
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
        'Forbid a user from using a command: {alias} <user> <command>',
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
          if (!this.l.isMaster(userId)) {
            if (uid === channelId) return 'You cannot blacklist the broadcaster'
            if (this.l.isMod(channelId, params[1])) return 'You cannot blacklist a moderator'
          }

          if (alias.blacklist && alias.blacklist.includes(uid)) return `${params[2]} is already blacklisted from using ${aliasName}`
          if (!alias.blacklist) alias.blacklist = []
          alias.blacklist.push(uid)
          return `Blacklisted ${params[1]} from using ${aliasName}`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global alias. Create copy
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return `You are not permitted to use ${aliasName}`
          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'No user with that name'
          if (!this.l.isMaster(userId)) {
            if (uid === channelId) return 'You cannot blacklist the broadcaster'
            if (this.l.isMod(channelId, params[1])) return 'You cannot blacklist a moderator'
          }

          // Because no channel alias was found we can create a new alias and delete it later if errors were found
          this.l.createAlias(channelId, aliasName, globalAlias)
          const alias = this.l.getAlias(channelId, aliasName)
          if (!alias) return 'Failed to create new alias?'
          if (!alias.blacklist) alias.blacklist = []
          alias.blacklist.push(uid)
          return `Blacklisted ${params[1]} from using ${aliasName}`
        }
        return 'No command with that name'
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
        'Remove user from command\'s blacklist: {alias} <user> <command>',
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
          if (!alias.blacklist || !alias.blacklist.includes(uid)) return `${params[1]} is not blacklisted from using ${aliasName}`
          alias.blacklist = alias.blacklist.filter(v => v !== uid)
          return `Removed ${params[1]} from ${aliasName}'s blacklist`
        }
        const globalAlias = this.l.getGlobalAlias(aliasName)
        if (globalAlias) { // Global aliases cant have white- or blacklists
          if (!this.l.isPermitted(globalAlias, userId, tags.badges, {ignoreWhiteList: true})) return `You are not permitted to use ${aliasName}`
          return `${params[1]} is not blacklisted from using ${aliasName}`
        }
        return 'No command with that name'
      }
    },
  },
]
