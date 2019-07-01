import Client from './client/Client'
import { PRIVMSG } from './client/parser'
import Commander from './Commander'
import Data from './Data'
import deepClone from './lib/deepClone'
import * as secretKey from './lib/secretKey'
import { onExit } from './lib/util'
import ParamValidator from './ParamValidator'

export interface BotOptions {
  masters: number[]
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
    for (const arg of process.argv) {
      // --message=45645645:Restart_complete
      if (arg.startsWith('--joinmsg=') || arg.startsWith('-jm=')) {
        const val = arg.slice(arg.indexOf('=') + 1)
        const split: string[] = val.split(/:/)
        joinMessage = { channelId: ~~split[0], message: split.slice(1).join(' ').replace(/\_/g, ' ') }
      }
    }

    this.opts = {
      masters: [],
      ...deepClone(options),
    }
    this.client = new Client({
      username: secretKey.getKey('./cfg/keys.json', 'twitch', 'username'),
      password: secretKey.getKey('./cfg/keys.json', 'twitch', 'password'),
      clientId: secretKey.getKey('./cfg/keys.json', 'twitch', 'client-id'),
      clientSecret: secretKey.getKey('./cfg/keys.json', 'twitch', 'client-secret'), // Optional but preferred for ~25x more api possibilities
      dataRoot: './data/',
      logInfo: true,
      // logAll: true,
      joinMessage,
    })

    this.data = new Data(this.client, './data/', ['apiCache', 'apiUsers', 'clientData'])

    this.commander = new Commander(this.client, this.data, this.opts.masters)

    // this.validator = new ParamValidator(this.commander, this.client)
    // this.validator.consoleInteract()
    // this.client.on('chat', this.onChat.bind(this))

    this.commander.init().then((pluginIds) => {
      this.client.connect()
      console.log(`Instantiated plugins: ${pluginIds.join(', ')}`)
    })
  }

  private async onChat(cid: number, uid: number, userstate: PRIVMSG['tags'], message: string, me: boolean, self: boolean, irc: PRIVMSG | null) {
    if (!this.validator) return
    console.log('\n>>>')

    const params = message.split(' ')
    console.log(await this.validator.validate(61365582, 'VALIDATOR_TEST', 'default', params.slice(1)))
  }

  private onExit(code: number) {
    if (this.data) this.data.saveAllSync()
  }
}
