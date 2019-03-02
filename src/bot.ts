import Client from './lib/Client'
import * as secretKey from './lib/secretKey'

export default class Bot {

  public client: Client

  constructor() {
    this.client = new Client({
      password: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'password'),
      username: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'username'),
    })

// tslint:disable-next-line: no-empty
    setTimeout(() => {
    }, 10000000)
  }

}
