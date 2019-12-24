import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'join',
  title: 'Join',
  description: 'Joins a channel',
  default: {
    alias: '$join',
    options: {
      userlvl: Userlvl.master,
    },
  },
  help: ['Join channels: {alias} <channels...>'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<CHANNEL...>', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_targetIds]: [number[] | undefined] = params
    const targetIds = _targetIds || [channelId]

    const results: Array<Promise<boolean>> = []
    for (const targetId of targetIds) {
      results.push(this.l.join([targetId]))
    }

    const res = await Promise.all(results)
    extra.words.slice(1)

    const names = extra.words.slice(1)
    const joined = []
    const failed = []
    let i = 0
    for (const success of res) {
      if (success) joined.push(names[i])
      else failed.push(names[i])
      i++
    }
    if (!joined.length && !failed.length) return 'Neither successful or unsucceful?'
    if (!joined.length) return `Failed or timedout: ${this.l.u.commaPunctuate(failed)}`
    if (!failed.length) return `Joined: ${this.l.u.commaPunctuate(joined)}`
    return `Joined: ${this.l.u.commaPunctuate(joined)}. Failed or timedout: ${this.l.u.commaPunctuate(failed)}`
  }
}
