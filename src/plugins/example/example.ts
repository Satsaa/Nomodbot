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
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  public cooldown: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', 'exact <var> [<opt_vars>]', this.callMain)
    this.call = this.l.addCall(this, this.call, 'default', 'name/regex/flags <message...>', this.callSecondary)
    this.call = this.l.addCall(this, this.call, 'default', 'join|part <CHANNELS...>', this.callTertiary)

    this.cooldown = this.l.addCall(this, this.call, 'default', '<ting>', this.cooldownMain)
  }

  public async init() {
    // Executed and awaited on plugin load
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
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

  public async cooldownMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [ting]: [string] = params
    // Command was called but it was on cooldown
    // Show a combined message for each of the users that called this when it was on cooldown?
    return 'On cooldown' // Ignored return value
  }

  public async unload() {
    // Remove referecens (on events etc)
    // No need to unload creates (options.creates) here
  }
}
