import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'myiq',
  title: 'MyIQ',
  description: 'Performs a quick study on the target and returns their RealIQ',
  default: {
    alias: '?myiq',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  requireDatas: [],
  creates: [['myIq']],
  help: [
    'Get your record and the channel record: {alias} record',
    'Returns your or users iq: {alias} [<USER>]',
  ],
}

interface MyIQData {
  high: {
    userId?: number
    value?: number
  }
  low: {
    userId?: number
    value?: number
  }
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.l.autoLoad('myIq', { high: {}, low: {} }, true)

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'record', this.callRecord)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<USER>]', this.callMain)
  }

  public async callRecord(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: ['record'] = params

    const data = this.l.getData(channelId, 'myIq') as MyIQData
    if (!data) return 'Data unavailable'

    const high = typeof data.high.value === 'number' ? data.high.value : Infinity
    const low = typeof data.low.value === 'number' ? data.low.value : -Infinity

    const byHigh = data.high.userId ? await this.l.api.getDisplay(data.high.userId) : 'God'
    const byLow = data.low.userId ? await this.l.api.getDisplay(data.low.userId) : 'God'
    return `@${extra.irc.tags['display-name']} The highest IQ is ${high} by ${byHigh} and the lowest IQ is ${low} by ${byLow}`
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_targetId]: [number | undefined] = params
    const recipientId = _targetId || userId

    const recipient = extra.words[1] || extra.irc.tags['display-name']

    const data = this.l.getData(channelId, 'myIq') as MyIQData
    if (!data) return 'Data unavailable'

    const high = typeof data.high.value === 'number' ? data.high.value : -Infinity
    const low = typeof data.low.value === 'number' ? data.low.value : Infinity

    const iq = Math.round(this.l.u.randomNormal(-50, 1000, 3))

    if (iq > high) { // New record
      const byDisplay = data.high.userId ? await this.l.api.getDisplay(data.high.userId) : 'God'

      data.high.value = iq
      data.high.userId = recipientId

      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)} Beat the old record of ${high} IQ by ${byDisplay || 'UnknownUser'} PogChamp`
    } else if (iq < low) { // New low-record
      const byDisplay = data.high.userId ? await this.l.api.getDisplay(data.high.userId) : 'God'

      data.low.value = iq
      data.low.userId = recipientId

      return `${recipient}'s RealIQ is ${iq} ${this.getEmote(iq)} Beat the old low-record of ${low} IQ by ${byDisplay || 'UnknownUser'} LUL`
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
