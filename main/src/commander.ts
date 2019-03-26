import * as path from 'path'
import Data from './Data'
import TwitchClient from './lib/Client'
import { IrcMessage } from './lib/parser'
import { readDirRecursive } from './lib/util'
import PluginLibrary from './pluginLib'

export interface Command {
  type: 'command',
  default: {
    /** Default command alias (e.g. !command) */
    alias: string,
    options: Pick<CommandAlias, Exclude<keyof CommandAlias, 'id'>>,
  }
  /** Usage instructions */
  help: string,
}

/** Controls a data type or something like that */
export interface Controller {
  type: 'controller',
}

export type PluginOptions = (Command | Controller) & {
  type: string,
  /** Unique id for identifying this plugin */
  id: string,
  name: string,
  description: string,
  /** Signal that this plugin creates these data types */
  creates?: Array<['static' | 'dynamic', string, string]>,
  /** Plugin is not enabled before these data types are loaded. [type,subType,name] */
  requires?: Array<['static' | 'dynamic', string, string, number?]>,
}

/** Properties for aliases (e.g. !uptime) */
export interface CommandAlias {
  /** The id of a command plugin */
  id: string,
  disabled?: boolean,
  cooldown?: number | {duration: number, uses: number},
  userCooldown?: number | {duration: number, uses: number},
}

export interface PluginInstance {
  // * Execute before enabling this plugin */
  init?: () => Promise<void>
  // * An alias of this command is called */
  call?: (channel: string, userstate: object, message: string, me: boolean) => Promise<string | null>,
}

export default class Commander {
  private plugins: {[x: string]: PluginOptions}
  private instances: {[x: string]: PluginInstance}
  private defaults: {[x: string]: CommandAlias}
  private client: TwitchClient
  private data: Data
  private pluginLib: PluginLibrary

  constructor(client: TwitchClient, data: Data) {
    this.plugins = {}
    this.instances = {}
    this.defaults = {}
    this.client = client
    this.data = data
    this.pluginLib = new PluginLibrary(client, data, this)
    this.client.on('chat', this.onPrivMessage.bind(this))
  }

  public async init(): Promise<PluginOptions[]> {
    this.data.autoLoad('static', 'aliases', {})
    this.data.autoLoad('dynamic', 'cooldowns', {})
    this.data.load('dynamic', 'global', 'cooldowns', {})
    const files = (await readDirRecursive(path.join(__dirname, '..', 'commands'))).filter(e => e.endsWith('.ts') || e.endsWith('.js'))
    if (!files || !files.length) return []
    const optionsArr = files.map(file => this.loadPlugin(file))
    this.findConflicts(optionsArr)
    return optionsArr
  }

  /** Check for duplicate data type creations and if a plugin requires data that no present plugin creates */
  public findConflicts(optionsArray: PluginOptions[]) {
    const messages: string[] = []
    const created: string[] = []
    const names: string[] = [] // Corresponding plugin name for created entries
    optionsArray.forEach((c) => {
      if (c.creates) {
        c.creates.forEach((e) => {
          if (created.includes(`${e[0]}\\${e[1]}\\${e[2]}`)) {
            messages.push(`${c.name} duplicates ${e[0]}\\${e[1]}\\${e[2]} from ${names[created.indexOf(`${e[0]}\\${e[1]}\\${e[2]}`)]}`)
          }
          names.push(c.name)
          created.push(`${e[0]}\\${e[1]}\\${e[2]}`)
        })
      }
    })
    optionsArray.forEach((r) => {
      if (r.requires) {
        r.requires.forEach((e) => {
          if (created.indexOf(`${e[0]}\\${e[1]}\\${e[2]}`) === -1) {
            messages.push(`${r.name} requires ${e[0]}\\${e[1]}\\${e[2]}`)
          }
        })
      }
    })
    if (messages.length) throw new Error(messages.join('/n'))
  }

  public createAlias(channel: string, alias: string, options: CommandAlias): boolean {
    if (!(this.data.static[channel] || {}).aliases) return false
    this.data.static[channel].aliases[alias] = options; return true
  }
  public deleteAlias(channel: string, alias: string) {
    if (!(this.data.static[channel] || {}).aliases) return false
    delete this.data.static[channel].aliases[alias]; return true
  }
  public enableAlias(channel: string, alias: string) {
    if (!((this.data.static[channel] || {}).aliases || {})[alias]) return false
    this.data.static[channel].aliases[alias].disabled = undefined; return true
  }
  public disableAlias(channel: string, alias: string) {
    if (!((this.data.static[channel] || {}).aliases || {})[alias]) return false
    this.data.static[channel].aliases[alias].disabled = true; return true
  }

  private loadPlugin(file: string) {
    const plugin: {options: PluginOptions, Instance: new() => PluginInstance} = require(file)
    if (plugin.options) {
      return this.handlePlugin(plugin.options, plugin.Instance)
    } else throw console.error('Plugin lacks options export: ' + file)
  }
  /** Helper function for loadPlugin */
  private handlePlugin(options: PluginOptions, constructor: new() => PluginInstance) {
    const type = options.type // Cant use options in default case
    this.plugins[options.id] = options
    switch (options.type) {
      case 'command':
        this.defaults[options.default.alias] = {...options.default.options, id: options.id}
        break
      case 'controller':
        break
      default:
        throw new Error('Unknown plugin type: ' + type)
    }
    this.instantiatePlugin(options, constructor) // Maybe this should be awaited?
    return options
  }

  private async instantiatePlugin(options: PluginOptions, constructor: new() => PluginInstance) {
    console.log(`Instantiating ${options.name}`)
    let res: Array<object | undefined> = []
    if (options.requires) {
      res = await Promise.all(options.requires.map(v => this.data.waitData(v[0], v[1], v[2], v[3] || 3000)))
      if (res.some(v => v === undefined)) {
        console.log(`${options.name} instantiation still waiting for data.`)
        await Promise.all(options.requires.map(v => this.data.waitData(v[0], v[1], v[2])))
      }
    }
    const instance = new constructor()
    if (typeof instance.init === 'function') await instance.init()
    console.log(`Instantiated ${options.name}`)
    this.instances[options.id] = instance
    if (typeof this.instances[options.id].call !== 'function') {
      throw new Error(`Invalid call function on command plugin instance: ${this.plugins[options.id].name}`)
    }
  }

  private onPrivMessage(channel: string, userstate: object, message: string, me: boolean) {
    const words = message.split(' ')
    if ((this.data.static[channel].aliases || {})[words[0]]) {
      this.callCommand(this.data.static[channel].aliases[words[0]], channel, userstate, message, me)
    } else if (this.defaults[words[0]]) this.callCommand(this.defaults[words[0]], channel, userstate, message, me)
  }

  private async callCommand(command: CommandAlias, channel: string, userstate: object, message: string, me: boolean) {
    if (!this.instances[command.id]) return console.log(`Cannot call unloaded command: ${command.id}`) // Command may not be loaded yet
    if (typeof this.instances[command.id].call !== 'function') throw new Error(`Invalid call function on command plugin instance: ${command.id}`)
    const res = await this.instances[command.id].call!(channel, userstate, message, me)
    if (typeof res === 'string') this.client.chat(channel, res)
    else if (typeof res) console.warn(res)
  }
}
