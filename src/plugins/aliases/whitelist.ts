import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'

const exp: Array<{options: PluginOptions, Instance: any}> = [
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
      help: ['Whitelist user to use command: {alias} <USER> <COMMAND>'],
    },

    Instance: class implements PluginInstance {
      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib
      }

      public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
        const aliasName = params[2].toLowerCase(),
              alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, tags.badges, { ignoreWhiteList: true })) return 'You cannot edit the whitelist of a command you are not permitted to use'

          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'

          let out: number[] = []
          if (alias.whitelist) out = [...alias.whitelist]
          if (alias.blacklist && alias.blacklist.includes(uid)) {
            out = alias.blacklist.filter(listUid => listUid !== uid)
          }
          if (out.includes(uid)) return `${params[1]} is already whitelisted to use ${aliasName}`
          out.push(uid)
          this.l.modAlias(channelId, aliasName, { whitelist: out })
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
      help: ['Remove user from the whitelist of command: {alias} <user> <command>'],
    },

    Instance: class implements PluginInstance {
      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib
      }

      public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
        const aliasName = params[2].toLowerCase(),
              alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, tags.badges, { ignoreWhiteList: true })) return 'You cannot edit the whitelist of a command you are not permitted to use'

          const uid = await this.l.api.getId(params[1])
          if (!uid) return 'Cannot find that user'
          if (!alias.whitelist || !alias.whitelist.includes(uid)) return `${params[1]} is not whitelisted for ${aliasName}`
          this.l.modAlias(channelId, aliasName, { whitelist: alias.whitelist.filter(listUid => listUid !== uid) })
          return `Removed ${params[1]} from the whitelist of ${aliasName}`
        }
        return 'Cannot find that command'
      }
    },
  },
]

module.exports = exp
