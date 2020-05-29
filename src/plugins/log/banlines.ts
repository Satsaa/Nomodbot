import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'


export interface BanLinesExtension {
  /** Returns true if user is marked as banned from using line commands. Note that this method will return undefined if the data was not already loaded */
  isBanned(channelId: number, userId: number): boolean | undefined
}

interface BanLinesData {
  [userId: number]: boolean
}

export const options: PluginOptions = {
  type: 'command',
  id: 'banlines',
  title: 'Ban Lines',
  description: 'Disallow a user from appearing in line commands',
  default: {
    alias: ['?banlines'],
    options: {
      userlvl: Userlvl.mod,
    },
  },
  help: ['Disallows user from appearing in line commands: {alias} <user> [unban|ban]'],
  creates: [['banlines']],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    const extensions: BanLinesExtension = {
      isBanned: this.isBanned.bind(this),
    }
    this.l.extend(options.id, extensions)

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<USER> [unban|ban]', this.callMain)
  }

  public async init() {
    this.l.autoLoad('banlines', {})
  }

  public isBanned(channelId: number, userId: number): boolean | undefined {
    const data = this.l.getData(channelId, 'banlines') as BanLinesData
    if (!data) return

    return Boolean(data[userId])
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [targetId, specifier]: [number, 'unban' | 'ban' | undefined] = params

    const displayName = this.l.api.cachedDisplay(targetId)
    if (!displayName) return 'Unknown user. This should not happen'

    const data = this.l.getData(channelId, 'banlines') as BanLinesData
    if (!data) return 'Data not available'

    const allow = specifier === 'unban'

    if (allow) {
      if (data[targetId] !== undefined) delete data[targetId]
      return `${displayName} has been allowed to appear in line commands`
    } else {
      data[targetId] = true
      return `${displayName} has been disallowed from appearing in line commands`
    }
  }
}
