import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { SteamExtension } from './steam'

export const options: PluginOptions = {
  type: 'command',
  id: 'richpresence',
  title: 'Steam Rich Presence',
  description: 'Gets the Rich Presence string for the streamer',
  default: {
    alias: '?mode',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Get {channel} steam rich presence info: {alias}',
    'Set {channel} steam id: {alias} set <NUMBER>',
  ],
  requirePlugins: ['steam'],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private ext: SteamExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.ext = this.l.ext.steam as SteamExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'set <NUMBER>', this.callSetId)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    if (!this.l.getData('global', 'steam')) return 'Steam data is currently unavailable'

    const rp = this.ext.getRichPresenceString(channelId)

    if (rp) return `${rp}`
    else return `The steamId of ${await this.l.api.getDisplay(channelId)} has not been set`
  }

  public async callSetId(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, steamId]: ['set', number] = params

    if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, extra.irc.tags.badges)) {
      return `You must be a ${this.l.userlvlString(userlvls.mod)} change the Steam ID`
    }

    const res = this.ext.setUserSteamId(channelId, steamId)

    if (res) return `Steam ID for ${await this.l.api.getDisplay(channelId)} set! Some commands require the bot (NoModBot) to be added as a friend on Steam by the streamer`
    return 'Setting steam id failed :/'
  }
}
