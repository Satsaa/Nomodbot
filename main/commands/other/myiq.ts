import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'myiq',
  name: 'MyIQ',
  description: 'Performs a quick study on the target and returns their RealIQ',
  default: {
    alias: '?myiq',
    options: {
      cooldown: {limit: 3, duration: 30},
      userCooldown: 60,
    },
  },
  requires: [],
  creates: [['myIQ']],
  help: [
    'Returns your or users iq: {alias} [<user>]',
    'Get your record and the channel record: {alias} record',
  ],
}

interface MyIQData {
  high: {
    user?: string,
    value?: number,
  },
  low: {
    user?: string,
    value?: number,
  },
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.l.autoLoad('myIQ', { high: {}, low: {} }, true)
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    const data = this.l.getData(channel, 'myIQ') as MyIQData
    if (!data) return 'Data unavailable'

    const high = typeof data.high.value === 'number' ? data.high.value : -Infinity
    const low = typeof data.low.value === 'number' ? data.low.value : Infinity

    if (params[1] && params[1].toLowerCase() === 'record') {
      return `The highest IQ is ${high} by ${data.high.user || 'God'} and the lowest IQ is ${low} by ${data.low.user || 'God'}`
    }

    const recipient = params[1] || userstate['display-name'] || 'Error'
    const iq = Math.round(this.l.u.randomNormal(-50, 1005, 3))

    if (iq > high) { // New record
      data.high.user = recipient.toLowerCase()
      data.high.value = iq
      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)} Beat the old record by ${iq - high} IQ PogChamp`
    } else if (iq < low) { // New low record
      data.low.user = recipient.toLowerCase()
      data.low.value = iq
      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)} Beat the old low record by ${low - iq} IQ LUL`
    } else { // No new record
      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)}`
    }
  }

  public async cooldown(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
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