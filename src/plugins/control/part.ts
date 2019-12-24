import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'part',
  title: 'Part',
  description: 'Leaves a channel',
  default: {
    alias: '$part',
    options: {
      userlvl: Userlvl.master,
    },
  },
  help: ['Leave {channel} or channels: {alias} [<channels...>]'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<CHANNEL...>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_targetIds]: [number[] | undefined] = params
    const targetIds = _targetIds || [channelId]

    const results: Array<Promise<boolean>> = []
    for (const targetId of targetIds) {
      results.push(this.l.part([targetId]))
    }

    const res = await Promise.all(results)
    extra.words.slice(1)

    const names = extra.words.slice(1)
    const parted = []
    const failed = []
    let i = 0
    for (const success of res) {
      if (success) parted.push(names[i])
      else failed.push(names[i])
      i++
    }

    if (!parted.length && !failed.length) return 'Neither successful or unsucceful?'
    if (!parted.length) return `Failed or timedout: ${this.l.u.commaPunctuate(failed)}`

    if (targetIds.includes(channelId)) return

    if (!failed.length) return `Parted: ${this.l.u.commaPunctuate(parted)}`
    return `Parted: ${this.l.u.commaPunctuate(parted)}. Failed or timedout: ${this.l.u.commaPunctuate(failed)}`
  }
}
