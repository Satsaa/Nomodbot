import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

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
      help: ['Whitelist user to use command: {alias} <user> <command>'],
    },

    Instance: class implements PluginInstance {
      public call: PluginInstance['call']
      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib

        this.call = this.l.addCall(this, this.call, 'default', '<USER> <COMMAND>', this.callMain)
      }

      public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
        const [targetId, aliasName]: [number, string] = params

        const alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, extra.irc.tags.badges, { ignoreWhiteList: true })) return 'You cannot edit the whitelist of a command you are not permitted to use'

          let out: number[] = []
          if (alias.whitelist) out = [...alias.whitelist]
          if (alias.blacklist && alias.blacklist.includes(targetId)) {
            out = alias.blacklist.filter(listUid => listUid !== targetId)
          }
          if (out.includes(targetId)) return `${extra.words[1]} is already whitelisted to use ${aliasName}`
          out.push(targetId)
          this.l.modAlias(channelId, aliasName, { whitelist: out })
          return `Added ${extra.words[1]} to the whitelist of ${aliasName}`
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
      public call: PluginInstance['call']
      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib

        this.call = this.l.addCall(this, this.call, 'default', '<USER> <COMMAND>', this.callMain)
      }

      public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
        const [targetId, aliasName]: [number, string] = params

        const alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, extra.irc.tags.badges, { ignoreWhiteList: true })) return 'You cannot edit the whitelist of a command you are not permitted to use'

          if (!targetId) return 'Cannot find that user'
          if (!alias.whitelist || !alias.whitelist.includes(targetId)) return `${extra.words[1]} is not whitelisted for ${aliasName}`
          this.l.modAlias(channelId, aliasName, { whitelist: alias.whitelist.filter(listUid => listUid !== targetId) })
          return `Removed ${extra.words[1]} from the whitelist of ${aliasName}`
        }
        return 'Cannot find that command'
      }
    },
  },
]

module.exports = exp
