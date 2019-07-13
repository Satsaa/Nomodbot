import Client from './client/client'
import Commander from './commander'
import Data from './data'
import deepClone from './lib/deepClone'
import * as secretKey from './lib/secretKey'
import { onExit } from './lib/util'
import ParamValidator from './paramValidator'
import { getArgs } from './argRules'

export interface BotOptions {
  masters: readonly number[]
}

export default class Bot {
  private client: Client
  private data: Data
  private opts: Required<BotOptions>
  private commander: Commander
  private validator?: ParamValidator
  private args: ReturnType<typeof getArgs>

  constructor(options: BotOptions) {
    onExit(this.onExit.bind(this))

    this.args = getArgs()
    if (Array.isArray(this.args)) throw this.args

    const joinMessage: {[channelId: number]: string} = {}
    if (this.args.args.global) {
      const _global = global as any
      if (_global[this.args.args.global[0] || 'bot']) {
        throw new Error(`global[${this.args.args.global[0] || 'bot'}] is already defined, define a different value for --global`)
      } else {
        _global[this.args.args.global[0] || 'bot'] = this
      }
    }

    if (this.args.args['join-message']) {
      for (const element of this.args.args['join-message']) {
        const split: string[] = element.split(/:/)
        joinMessage[~~split[0]] = split.slice(1).join(':').replace(/(?<!\\)_/g, ' ').replace(/\\_/g, '_')
      }
    }
    this.opts = {
      masters: [],
      ...deepClone(options),
    }

    const configPath = './cfg/keys.json'

    const username = secretKey.getKey(configPath, 'twitch', 'username')
    const password = secretKey.getKey(configPath, 'twitch', 'password')
    const clientId = secretKey.getKey(configPath, 'twitch', 'client-id')
    const clientSecret = secretKey.getKey(configPath, 'twitch', 'client-secret')
    if (typeof username !== 'string' || typeof password !== 'string' || typeof clientId !== 'string') {
      throw new TypeError('Provide a string value for twitch.username, twitch.password and twitch.client-id in ./cfg/keys.json')
    }

    if (!(typeof clientSecret === 'string' || clientSecret === null || clientSecret === undefined)) {
      throw new TypeError('Provide a valid value for twitch.clientSecret in ./cfg/keys.json (undefined or a string)')
    }


    this.client = new Client({
      username,
      password,
      clientId,
      clientSecret,
      dataRoot: './data/',
      logInfo: true,
      // logAll: true,
      join: this.args.args['join-channel'] || [],
      joinMessage,
    })

    this.data = new Data(this.client, './data/', ['apiCache', 'apiUsers', 'clientData'])

    this.commander = new Commander(this.client, this.data, this.opts.masters)

    // Debug parameter validation
    // this.validator = new ParamValidator(this.commander, this.client)
    // this.validator.consoleInteract()

    this.commander.init().then((pluginIds) => {
      this.client.connect()
      console.log(`Instantiated plugins: ${pluginIds.join(', ')}`)
    })
  }

  private onExit(code: number) {
    if (this.data) this.data.saveAllSync()
  }
}
