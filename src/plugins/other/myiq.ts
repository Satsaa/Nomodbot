import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'myiq',
  title: 'MyIQ',
  description: 'Performs a quick study on the target and returns their RealIQ',
  default: {
    alias: '?myiq',
    options: {
      cooldown: {limit: 3, duration: 30},
      userCooldown: 60,
    },
  },
  requireDatas: [],
  creates: [['myIq']],
  help: [
    'Returns your or users iq: {alias} [<user>]',
    'Get your record and the channel record: {alias} record',
  ],
}

interface MyIQData {
  high: {
    userId?: number,
    value?: number,
  },
  low: {
    userId?: number,
    value?: number,
  },
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.l.autoLoad('myIq', { high: {}, low: {} }, true)
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const data = this.l.getData(channelId, 'myIq') as MyIQData
    if (!data) return 'Data unavailable'

    const high = typeof data.high.value === 'number' ? data.high.value : -Infinity
    const low = typeof data.low.value === 'number' ? data.low.value : Infinity

    if (params[1] && params[1].toLowerCase() === 'record') {
      const byHigh = data.high.userId ? await this.l.api.getDisplay(data.high.userId) : 'God'
      const byLow = data.low.userId ? await this.l.api.getDisplay(data.low.userId) : 'God'
      return `The highest IQ is ${high} by ${byHigh} and the lowest IQ is ${low} by ${byLow}`
    }

    const recipient = params[1] || tags['display-name'] || 'Error'
    const iq = Math.round(this.l.u.randomNormal(-50, 1005, 3))

    if (iq > high) { // New record
      data.high.value = iq
      const byDisplay = data.high.userId ? await this.l.api.getDisplay(data.high.userId) : 'God'
      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)} Beat the old record of ${low - high} IQ by ${byDisplay || 'UnknownUser'} PogChamp`
    } else if (iq < low) { // New low record
      data.low.value = iq
      const byDisplay = data.high.userId ? await this.l.api.getDisplay(data.high.userId) : 'God'
      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)} Beat the old low record of ${low - iq} IQ by ${byDisplay || 'UnknownUser'} LUL`
    } else { // No new record
      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)}`
    }
  }

  public getEmote(v: number) {
    if (v < 0) {
      return 'POGGERS'
    } else if (v < 10) {
      return 'SMOrc'
    } else if (v === 69) {
      return 'Kreygasm'
    } else if (v < 69) {
      return 'BrokeBack'
    } else if (v < 100) {
      return '4Head'
    } else if (v < 150) {
      return 'SeemsGood'
    } else if (v < 225) {
      return 'PogChamp'
    } else if (v < 300) {
      return ':o'
    } else if (v === 322) {
      return ', stop throwing.'
    } else if (v === 420) {
      return 'VapeNation'
    } else if (v < 420) {
      return 'Ayy 👽'
    } else {
      return 'WutFace'
    }
  }
}
