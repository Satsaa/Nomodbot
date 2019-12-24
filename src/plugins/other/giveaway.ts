import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
import { fitStrings, commaPunctuate, randomFloat, plural } from '../../main/lib/util'
import { ListsExtension } from '../lists/lists'

export const options: PluginOptions = {
  type: 'command',
  id: 'giveaway',
  title: 'Giveaway',
  description: 'Create giveaways',
  default: {
    alias: ['?giveaway'],
    options: {
      cooldown: 30,
    },
  },
  help: {
    default: [
      'Get giveaway status: {alias}',
      'Create a giveaway: {alias} start [<userlevel>]',
      'Change minimum required userlevel or change userlevels power: {alias} userlevel [<power>]',
      'Change userlevel power: {alias} setpower <userlevel> <0-Infinity>',
      'Pick a winner or multiple: {alias} pick [<count>]',
      'Pause the giveaway: {alias} pause',
      'Unpause the giveaway: {alias} unpause',
      'End the giveaway: {alias} end',
      'Join the giveaway: {alias} join',
      'Leave the giveaway: {alias} leave',
      'Create join command: {alias} createjoin <command>',
    ],
    join: [
      'Join the giveaway: {alias}',
      'Leave the giveaway: {alias} leave',
    ],
  },
  requirePlugins: [],
  creates: [['giveaway']],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private validUserlvls: Array<keyof typeof Userlvl>

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.validUserlvls = Object.keys(Userlvl).filter(v => v !== (~~v).toString()) as Array<keyof typeof Userlvl>

    const powerStuff: GiveawayData['powers'] = [null, null, null, null, null, null, null, null, null, null, null]
    for (const lvl of this.validUserlvls) {
      powerStuff[Userlvl[lvl]] = 1
    }

    const defaultData: GiveawayData = { active: false, userlvl: 0, powers: powerStuff, entries: {}, paused: false, winners: {} }
    this.l.autoLoad('giveaway', defaultData, false)

    const userlvlParam = this.validUserlvls.join('|')

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', `start|begin [${userlvlParam}]`, this.callStart)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', `userlevel|userlvl ${userlvlParam} [<0-999>]`, this.callLvl)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', `setpower|setweight|power|weight ${userlvlParam} <0-999>`, this.callPower)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'powers|weights', this.callPowers)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'pick|choose [<1-1000>]', this.callPick)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'pause', this.callPause)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'unpause', this.callUnpause)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'end|quit', this.callEnd)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'createjoin|addjoin <!COMMAND>', this.callCreateJoin)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'winners|picked', this.callGetWinners)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'join|enter', this.callJoin)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'leave|exit', this.callPart)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<NOTHING>', this.callGetWinners)

    this.handlers = this.l.addHandlers(this, this.handlers, 'join', 'leave|part', this.callPart)
    this.handlers = this.l.addHandlers(this, this.handlers, 'join', '<NOTHING>', this.callJoin)
  }

  public async callStart(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, userlvl]: [string, number] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    const giveawayComs = this.l.getAliasesById(channelId, 'giveaway')
    const joinComs: string[] = []
    if (!giveawayComs) return 'Channel commands not loaded???'
    for (const name in giveawayComs) {
      if (giveawayComs[name].group === 'join') joinComs.push(name)
    }


    const prevVal = data.active
    if (!prevVal) {
      data.active = true
      data.winners = {}
      data.entries = {}
    }
    data.paused = false
    return `${
      prevVal
        ? 'Giveaway already started!'
        : 'Giveaway started!'
    } ${
      joinComs.length
        ? `Join with ${commaPunctuate(joinComs, ', ', ' or ')}`
        : `Join with "${extra.words[0]} join" or create a join command with "${extra.words[0]} createjoin <command>"`
    }`
  }

  public async callLvl(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, userlvl, power]: [string, keyof typeof Userlvl, number?] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    if (power !== undefined) return this.callPower(channelId, userId, params, extra)

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    const level = Userlvl[userlvl]
    if (level === undefined) return 'Invalid userlevel'

    if (extra.userlvl < data.userlvl) return 'You cannot change the required userlevel because it is higher than your own'
    if (extra.userlvl < level) return 'You cannot set the required userlevel higher than your own'

    data.userlvl = level

    let removedEntries = 0
    for (const userId in data.entries) {
      if (data.entries[userId] < data.userlvl) {
        delete data.entries[userId]
        removedEntries++
      }
    }

    return `Required userlevel changed to ${userlvl} (${level})${
      removedEntries ? `. Removed ${plural(removedEntries, 'entry', 'entries')}` : ''
    }`
  }

  public async callPower(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, userlvl, power]: [string, keyof typeof Userlvl, number] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    const level = Userlvl[userlvl]
    if (level === undefined) return 'Invalid userlevel'

    if (extra.userlvl < level) return 'You cannot change the userlevel power because it is higher than your own'

    const prevPow = data.powers[level]
    data.powers[level] = power
    return `Entry power of ${userlvl}s changed from ${prevPow} to ${power}`
  }

  public async callPowers(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: [string] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    return `Powers: ${this.validUserlvls.map(lvl => `${lvl}: ${data.powers[Userlvl[lvl]]}`).join(', ')}`
  }

  public async callPause(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: [string] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    if (!data.active) return 'Giveaway is not active'
    if (data.paused) return 'Giveaway is already paused'
    data.paused = true

    return 'Giveaway paused'
  }

  public async callPick(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, count]: [string, number?] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    if (!Object.keys(data.entries).length) return 'Atleast one user has to enter the giveaway before you can pick winners'

    let totalPower = 0
    for (const userId in data.entries) {
      totalPower += data.powers[data.entries[userId]] || 0
    }
    if (!totalPower) return `The power of all entries is 0 which means no winners can be picked. Change powers with ${extra.words[0]} setpower <userlevel> <power>`

    const _count = count || 1

    const winners: { [userId: number]: number } = {}
    for (let i = 0; i < _count; i++) {
      const selectedPowerPoint = randomFloat(0, totalPower)
      let currentPowerPoint = 0
      for (const userId in data.entries) {
        const lvl = data.entries[userId]
        const power = data.powers[lvl] || 0
        currentPowerPoint += power
        if (currentPowerPoint >= selectedPowerPoint) {
          if (winners[userId]) winners[userId]++
          else winners[userId] = 1
          break
        }
      }
    }


    const winnerStrs: string[] = []
    for (const userId in winners) {
      if (data.winners[userId]) data.winners[userId].count += winners[userId]
      else data.winners[userId] = { userlvl: data.entries[userId], count: winners[userId] }

      winnerStrs.push(`${this.l.api.cachedDisplay(~~userId) || 'Unknown'}${winners[userId] > 1 ? ` (x${winners[userId]})` : ''}`)
    }

    if (winnerStrs.length) {
      return `Selected ${commaPunctuate(winnerStrs)}`
    } else {
      return 'Selected no winners'
    }
  }

  public async callUnpause(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: [string] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    if (!data.active) return 'Giveaway is not active'
    if (!data.paused) return 'Giveaway is already unpaused'
    data.paused = false

    return 'Giveaway unpaused'
  }

  public async callEnd(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: [string] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to modify giveaways'

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    const winnerStrs: string[] = []
    for (const userId in data.winners) {
      winnerStrs.push(`${this.l.api.cachedDisplay(~~userId) || 'Unknown'}${data.winners[userId].count > 1 ? ` (x${data.winners[userId].count})` : ''}`)
    }

    data.active = false
    data.paused = false
    data.entries = {}

    return `Giveaway ended with ${winnerStrs.length ? commaPunctuate(winnerStrs) : 'nobody'} winning`
  }

  public async callCreateJoin(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, alias]: [string, string] = params
    if (!this.l.isPermitted(extra.alias, userId, extra.irc.tags.badges)) return 'You are not permitted to create commands'

    if (this.l.getAlias(channelId, alias)) return 'That command already exists'

    this.l.setAlias(channelId, alias, { ...extra.alias, ...{ group: 'join' } })

    return `Created join command ${alias}`
  }

  public async callGetWinners(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: [string] = params

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data) return 'Data unavailable'

    const winnerStrs: string[] = []
    for (const userId in data.winners) {
      winnerStrs.push(`${this.l.api.cachedDisplay(~~userId) || 'Unknown'}${data.winners[userId].count > 1 ? ` (x${data.winners[userId].count})` : ''}`)
    }


    return `${
      data.active
        ? `${winnerStrs.length ? ` Winners: ${commaPunctuate(winnerStrs)}` : 'No winners have been chosen yet'}`
        : `${winnerStrs.length ? ` Previous winners: ${commaPunctuate(winnerStrs)}` : 'No winners were chosen'}`
    }`
  }

  public async callJoin(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data || data.active) return

    if (data.userlvl <= extra.userlvl) data.entries[userId] = extra.userlvl
  }

  public async callPart(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: [string] = params

    const data = this.l.getData(channelId, 'giveaway') as GiveawayData
    if (!data || !data.active) return

    if (data.entries[userId]) delete data.entries[userId]
    else return 'You have not joined the giveaway'
    return 'You left the giveaway'
  }
}


interface GiveawayData {
  active: boolean
  paused: boolean
  entries: { [userId: number]: Userlvl }
  winners: { [userId: number]: Winner }
  userlvl: Userlvl
  powers: [number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null]
}

interface Winner {
  userlvl: Userlvl
  count: number
}
