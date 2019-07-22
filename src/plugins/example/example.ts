import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

/*
A plugin file usually has 1 plugin, but you can have multiple if you export an array like:

const exp: Array<{options: PluginOptions, Instance: any}> = [
  {
    options: { ... },
    Instance: class implements PluginInstance { ... },
  },
  {
    options: { ... },
    Instance: class implements PluginInstance { ... },
  },
]
module.exports = exp
*/

export const options: PluginOptions = {
  type: 'command',
  id: 'example',
  title: 'Example',
  description: 'Is an example',
  default: {
    alias: '!example',
    options: {
      disabled: true,
      userlvl: userlvls.any,
      cooldown: 30,
      userCooldown: 60,
    },
  },
  creates: [
    ['folder', 'file'],
    ['channelFile'],
  ],
  // requireDatas: ['never','loaded'],
  // requirePlugins: ['notaplugin'],
  noUnload: true, // Blocks unloading
  help: [
    'Is an example: {alias} required this|that <variable> [optional] [<optVar>] [<multiword...>]',
    'nother example',
  ],
  disableMention: true,
  allowMentions: true,
  // whisperOnCd: true, // Send whisper if alias was on cooldown
  // Defined cooldown handlers are ignored and call handlers are used instead
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'exact <var> [<opt_vars>]', this.callPrimary, this.cooldownPrimary)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'name/regex/flags <message...>', this.callSecondary)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'join|part <CHANNELS...>', this.callTertiary)
  }

  public async init() {
    // Executed and awaited on plugin load
  }

  public async callPrimary(channelId: number, userId: number, params: any, extra: Extra) {
    const [exact, variable, optVar]: ['exact', string, string | undefined] = params // Inititalize params from the ParamValidator
    return 'Example message 1'
  }
  public async callSecondary(channelId: number, userId: number, params: any, extra: Extra) {
    const [match, message]: [string, string[]] = params
    return 'Example message 2'
  }
  public async callTertiary(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, channelIds]: ['join' | 'part', number[]] = params
    // join(channels)
    return `${action}ed` // joined or parted
  }

  public async cooldownPrimary(channelId: number, userId: number, params: any, extra: Extra) {
    const [ting]: [string] = params
    // Command was called but it was on cooldown
    // Show a combined message for each of the users that called this when it was on cooldown?
    return 'On cooldown' // Whispered to user because this was defined as a cooldown handler
  }

  public async unload() {
    // Remove referecens (on events etc)
    // No need to unload creates (options.creates) here
  }
}
