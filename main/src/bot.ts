import Commander from './Commander'
import Data from './Data'
import Client from './lib/Client'
import * as secretKey from './lib/secretKey'

export default class Bot {

  public client: Client
  public data: Data
  private commander: Commander

  constructor() {
    this.client = new Client({
      username: secretKey.getKey('./main/cfg/keys.json', 'twitch', 'username'),
      password: secretKey.getKey('./main/cfg/keys.json', 'twitch', 'password'),
    })
    this.client.connect()
    this.client.once('welcome', () => this.client.join('#satsaa'))

    this.data = new Data(this.client)
    this.commander = new Commander(this.client, this.data)

    this.commander.init().then((result) => {
      if (result.failed.length) console.error(`Required 'options' export missing in: ${result.failed.join(', ')}`)
      console.log(`Loaded commands: ${result.loaded.join(', ')}`)
    }, (err) => {
      console.error('Error loading commands:', err)
    })
  }
}
