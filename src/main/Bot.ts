import Client from './client/Client'
import Commander from './Commander'
import Data from './Data'
import * as secretKey from './lib/secretKey'
import { onExit } from './lib/util'

export interface BotOptions {
  masters: number[],
}

export default class Bot {

  public client: Client
  public data: Data
  public opts: Required<BotOptions>
  private commander: Commander

  constructor(options: BotOptions) {

    onExit(this.onExit.bind(this))
    this.opts = {
      masters: [],
      ...options,
    }
    this.client = new Client({
      username: secretKey.getKey('./cfg/keys.json', 'twitch', 'username'),
      password: secretKey.getKey('./cfg/keys.json', 'twitch', 'password'),
      clientId: secretKey.getKey('./cfg/keys.json', 'twitch', 'client-id'),
      dataRoot: './data/',
      logInfo: true,
      // logAll: true,
    })

    this.data = new Data(this.client, './data/', ['apiCache', 'apiUsers', 'clientData'])
    this.commander = new Commander(this.client, this.data, this.opts.masters)

    this.commander.init().then((pluginIds) => {
      this.client.connect()
      console.log(`Instantiated plugins: ${pluginIds.join(', ')}`)
    })
  }

  private onExit(code: number) {
    if (this.data) this.data.saveAllSync()
  }
}