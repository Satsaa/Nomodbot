import * as secretKey from './lib/secretKey';
import Client from './lib/Client';
// client.connect()

export default class Bot {
  
  client: Client;

  constructor() {
    this.client = new Client({
      username: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'username'),
      password: secretKey.getKey('./src/cfg/keys.json', 'twitch', 'password')
    })
    
    setTimeout(() => {
    }, 10000000)
  }
  
}