import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'lines',
  title: 'Lines',
  description: 'Shows how many messages a user has sent',
  default: {
    alias: '?lines',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Show the total amount of messages sent by you or user: {alias} [<USER>]'],
  requirePlugins: ['log'],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<USER>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_targetId]: [number | undefined] = params
    const targetId = _targetId || userId


    // eslint-disable-next-line
    // (async()=>{const m=[];const s=[];for(let i=0;i<10;i++){m.push(-Infinity);s.push(0);}const u=(this.l.ext.log).getData(channelId).users;for(const o in u){const b=u[o];if(!b.events.chat)continue;const l=b.events.chat.offsets.length;if(b.events.chat){for(let i=0;i<10;i++){if (m[i] < l) {m.splice(i, 0, l);s.splice(i, 0, ~~o);m.pop();s.pop();break;}}}}let r='';for (let i=0;i<10;i++)r+=`${await this.l.api.getDisplay(s[i])} with ${m[i]} msgs; `;return r})()
    // 

    if (!this.log.getUser(channelId, targetId)) return 'That user has not been seen here before'

    const res = this.log.eventCount(channelId, targetId, 'chat')
    if (res === undefined) return 'Log data is unavailable at the moment'

    return extra.words[1]
      ? `${await this.l.api.getDisplay(targetId)} has sent ${this.l.u.plural(res, 'message')}`
      : `You have sent ${this.l.u.plural(res, 'message')}`
  }
}
