import Client from './client/client'
import Commander from './commander'
import Data from './data'
import deepClone from './lib/deepClone'
import * as secretKey from './lib/secretKey'
import { onExit } from './lib/util'
import ParamValidator from './paramValidator'
import Args from './lib/args'

export interface BotOptions {
  masters: number[]
  args: Args
}

export default class Bot {
  private client: Client
  private data: Data
  private opts: Required<BotOptions>
  private commander: Commander
  private validator?: ParamValidator

  constructor(options: BotOptions) {
    onExit(this.onExit.bind(this))

    // Launch args
    let joinMessage = null
    if (options.args.args['join-message']) {
      const split: string[] = options.args.args['join-message'][0].split(/:/)
      joinMessage = { channelId: ~~split[0], message: split.slice(1).join(' ').replace(/\_/g, ' ') }
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
