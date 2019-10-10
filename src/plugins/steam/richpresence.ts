import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { SteamExtension } from './steam'

export const options: PluginOptions = {
  type: 'command',
  id: 'richpresence',
  title: 'Steam Rich Presence',
  description: 'Gets the Rich Presence string or the steam game name for the streamer',
  default: {
    alias: '?mode',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Get steam rich presence info or game info for {channel}: {alias}',
    'Set steam id for {channel}: {alias} set <NUMBER>',
  ],
  requirePlugins: ['steam'],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private steam: SteamExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.steam = this.l.ext.steam as SteamExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'set <NUMBER>', this.callSetId)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    if (!this.l.getData('global', 'steam')) return 'Steam data is currently unavailable'

    const rp = this.steam.getRichPresenceString(channelId)

    if (rp) {
      return `${rp}`
    } else {
      const channelName = await this.l.api.getDisplay(channelId)
      return `The steamId of ${channelName} has not been set properly or ${channelName} is not added as a friend on Steam`
    }
  }

  public async callSetId(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, steamId]: ['set', number] = params

    if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, extra.irc.tags.badges)) {
      return `You must be a ${this.l.userlvlString(userlvls.mod)} change the Steam ID`
    }

    const res = this.steam.setUserSteamId(channelId, steamId)

    if (res) return `Steam ID for ${await this.l.api.getDisplay(channelId)} set! Some commands require the bot (${this.steam.getUsername()}) to be added as a friend on Steam by the streamer`
    return 'Setting steam id failed :/'
  }
}
