import Commander from './Commander'
import Data from './Data'
import Client from './lib/Client'
import * as secretKey from './lib/secretKey'
import {onExit} from './lib/util'

export default class Bot {

  public client: Client
  public data: Data
  private commander: Commander

  constructor() {
    onExit(this.onExit.bind(this))
    this.client = new Client({
      username: secretKey.getKey('./main/cfg/keys.json', 'twitch', 'username'),
      password: secretKey.getKey('./main/cfg/keys.json', 'twitch', 'password'),
      dataDir: './main/data/dynamic/global/',
      logIrc: true,
    })
    this.client.connect()
    this.client.on('welcome', () => {this.client.join('#satsaa')})

    this.data = new Data(this.client, './main/data/')

    this.commander = new Commander(this.client, this.data)

    this.commander.init().then((result) => {
      console.log(result)
    })
  }

  private onExit(code: number) {
    this.data.saveAllSync()
  }
}
