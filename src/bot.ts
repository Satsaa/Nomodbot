import Data from './data'
import Client from './lib/Client'
import * as secretKey from './lib/secretKey'

export default class Bot {

  public client: Client
  public data: Data

  constructor() {
    this.client = new Client({
      username: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'username'),
      password: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'password'),
    })

    this.data = new Data()
  }

}
