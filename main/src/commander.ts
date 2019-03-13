import * as fs from 'fs'
import * as path from 'path'
import Data from './Data'
import TwitchClient from './lib/Client'

export interface CommandPlugin {
  type: 'command',
  name: string,
  description: string,
  default: string,
  defaultHasPrefix: boolean,
  help: string,
  call: (a: string) => string,
}

export interface ControllerPlugin {
  type: 'controller'
  name: string,
  description: string,
}

export default class Commander {
  public commands: {[x: string]: CommandPlugin}
  private client: TwitchClient
  private data: Data

  constructor(client: TwitchClient, data: Data) {
    this.commands = {}
    this.client = client
    this.data = data

    this.client.on('message', this.onPrivMessage.bind(this))
  }

  public init(): Promise<{loaded: string[], failed: string[]}> {
    this.data.autoLoad('static', 'commands', {})
    return new Promise((resolve, reject) => {
      readDirRecursive('./main/commands/', (err, files) => {
        if (err) return reject(err)
        if (!files || !files.length) return resolve({loaded: [], failed: []})
        const loaded: string[] = []
        const failed: string[] = []
        files.forEach((file) => {
          const options = require(file).options
          if (options) {
            loaded.push(options.name)
            this.commands[options.name] = options
          } else failed.push(path.basename(file))
        })
        return resolve({loaded, failed})
      })
    })
  }

  private onPrivMessage(channel: string, userstate: object, message: string) {
    const words = message.split(' ')
  }
}

function readDirRecursive(dir: string, cb: (err: null | Error, files?: string[]) => void) {
  const result: string[] = []
  fs.readdir(dir, (err, files) => {
    if (err) return cb(err)
    if (!files.length) return cb(null, result)
    let pending = files.length
    files.forEach((file) => {
      file = path.resolve(dir, file)
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          readDirRecursive(file, (err, files) => {
            if (files) result.push(...files)
            if (--pending === 0) return cb(null, result)
          })
        } else {
          result.push(file)
          if (--pending === 0) return cb(null, result)
        }
      })
    })
  })
}
