import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
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
      help: ['Forbid user from using command: {alias} <user> <command>'],
    },

    Instance: class implements PluginInstance {
      public call: PluginInstance['call']
      private l: PluginLibrary

      constructor(pluginLib: PluginLibrary) {
        this.l = pluginLib

        this.call = this.l.addCall(this, this.call, 'default', '<USER> <COMMAND>', this.callMain)
      }

      private async callMain(channelId: number, userId: number, params: any, extra: Extra) {
        const [targetId, aliasName]: [number, string] = params

        const alias = this.l.getAlias(channelId, aliasName)
        if (alias) { // Channel alias
          if (!this.l.isPermitted(alias, userId, extra.irc.tags.badges, { ignoreWhiteList: true })) return 'You cannot edit the blacklist of a command you are not permitted to use'

          if (targetId === channelId) return 'You cannot blacklist the broadcaster'
          if (this.l.isMod(channelId, extra.words[1])) return 'You cannot blacklist a moderator'

          if (alias.blacklist && alias.blacklist.includes(targetId)) return `${extra.words[2]} is already blacklisted from using ${aliasName}`

          let out: number[] = []
          if (alias.blacklist) out = [...alias.blacklist]
          out.push(targetId)
          this.l.modAlias(channelId, aliasName, { blacklist: out })
          return `Blacklisted ${extra.words[1]} from using ${aliasName}`
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
      help: ['Remove user from the blacklist of command: {alias} <user> <command>'],
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
          if (!this.l.isPermitted(alias, userId, extra.irc.tags.badges, { ignoreWhiteList: true })) return 'You cannot edit the blacklist of a command you are not permitted to use'

          if (!alias.blacklist || !alias.blacklist.includes(targetId)) return `${extra.words[1]} is not blacklisted from using ${aliasName}`
          this.l.modAlias(channelId, aliasName, { blacklist: alias.blacklist.filter(v => v !== targetId) })
          return `Removed ${extra.words[1]} from ${aliasName}'s blacklist`
        }
        return 'Cannot find that command'
      }
    },
  },
]

module.exports = exp
