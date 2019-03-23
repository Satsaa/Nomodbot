import { EventEmitter } from 'events'
import * as fs from 'fs'
import TwitchClient from './lib/Client'
import { IrcMessage } from './lib/parser'
const fsp = fs.promises

export default class Data extends EventEmitter {

  /** This data changes when events happen */
  public static: {[x: string]: {[x: string]: {[x: string]: any}}}
  /** This data changes all the time but is only saved on exit */
  public dynamic: {[x: string]: {[x: string]: {[x: string]: any}}}
  public dataPath: string
  private client: TwitchClient
  private autoLoads: Array<{type: 'static' | 'dynamic', name: string, defaultData: null | object, cb?: (data: object) => void}>

  constructor(client: TwitchClient, dataPath: string) {
    super()
    this.dataPath = dataPath.endsWith('/') ? dataPath : dataPath + '/'

    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath)
    if (!fs.existsSync(`${dataPath}static`)) fs.mkdirSync(`${dataPath}static`)
    if (!fs.existsSync(`${dataPath}dynamic`)) fs.mkdirSync(`${dataPath}dynamic`)

    this.client = client
    this.client.on('join', this.onJoin.bind(this))
    this.client.on('part', this.onPart.bind(this))

    this.static = {}
    this.dynamic = {}

    this.autoLoads = []
  }

  /** Returns the path to the data file */
  public getPath(type: 'static' | 'dynamic', subType: string, name: string, fileType: string = 'json') {
    return `${this.dataPath}${type}/${subType}/${name}.${fileType}`
  }

  /**
   * Returns the data or undefined if it isn't loaded.  
   * Data will be an object and therefore a reference, so keep that it mind. The undefined value is not a reference.
   */
  public getData(type: 'static' | 'dynamic', subType: string, name: string) {
    if ((this[type][subType] || {})[name]) return this[type][subType][name]
    return
  }
  /** Sets the data variable to `value` */
  public setData(type: 'static' | 'dynamic', subType: string, name: string, value: object) {
    if (!this[type][subType]) this[type][subType] = {}
    return this[type][subType][name] = value
  }
  /** Delete the data */
  public delData(type: 'static' | 'dynamic', subType: string, name: string) {
    if ((this[type][subType] || {})[name]) delete this[type][subType][name]
  }

  /** Wait until the data is loaded. Returns error if timedout */
  public waitData(type: 'static' | 'dynamic', subType: string, name: string, timeout?: number): Promise<object | undefined> {
    return new Promise((resolve) => {
      if (this.getData(type, subType, name)) return resolve(this.getData(type, subType, name))
      const cb = (data: object) => { resolve(data) }
      if (timeout) {
        const deleteCb = () => { clearTimeout(_timeout)}
        const _timeout = setTimeout(() => {
          this.removeListener(`load ${type} ${subType} ${name}`, deleteCb)
          this.removeListener(`load ${type} ${subType} ${name}`, cb)
          resolve(undefined)
        }, timeout)
        this.once(`load ${type} ${subType} ${name}`, deleteCb)
      }
      this.once(`load ${type} ${subType} ${name}`, cb)
    })
  }

  public saveAllSync() {
    for (const subType in this.static) {
      for (const name in this.static[subType]) {
        fs.writeFileSync(`${this.dataPath}static/${subType}/${name}.json`, JSON.stringify(this.static[subType][name], null, 2))
      }}
    for (const subType in this.dynamic) {
      for (const name in this.dynamic[subType]) {
        fs.writeFileSync(`${this.dataPath}dynamic/${subType}/${name}.json`, JSON.stringify(this.dynamic[subType][name], null, 2))
      }}
  }

  /**
   * Saves a file in `Data.dataPath`/`type`/`subType`/`name`
   * @param type 'static' or 'dynamic' required
   * @param subType E.g. 'default', 'global'. Use autoLoad for channel specific data.
   * @param name File name
   * @param unload Unload from memory if save is succesful
   */
  public async save(type: 'static' | 'dynamic', subType: string, name: string, unload: boolean = false) {
    if (!this.getData(type, subType, name)) return console.error(`${name} isn't loaded and is therefore not saved`)
    try {
      await fsp.writeFile(`${this.dataPath}${type}/${subType}/${name}.json`, JSON.stringify(this.getData(type, subType, name), null, 2))
      this.delData(type, subType, name)
    } catch (err) {
      console.log(`Could not save ${name}:`, err)
    }
  }

  /**
   * Loads a file in `Data.dataPath`/`type`/`subType`/`name`
   * @param type 'static' or 'dynamic' required
   * @param subType E.g. 'default', 'global'. Use autoLoad for channel specific data.
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   */
  public load(type: 'static' | 'dynamic', subType: string, name: string, defaultData: null | object , cb?: (data: object) => void) {
    if (!this[type][subType]) this[type][subType] = {}
    if (this.getData(type, subType, name)) throw new Error(`${name} has already been loaded by another source`)

    const file = `${this.dataPath}${type}/${subType}/${name}.json`
    // tslint:disable-next-line: no-bitwise
    fs.access(file, fs.constants.F_OK | fs.constants.W_OK, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          if (defaultData !== null) {
            const pathOnly = file.slice(0, file.lastIndexOf('/'))
            if (!fs.existsSync(pathOnly)) fs.mkdirSync(pathOnly, {recursive: true})
            const cbData = this.setData(type, subType, name, defaultData)
            this.emit(`load ${type} ${subType} ${name}`, cbData)
            this.save(type, subType, name).then((result) => {
              if (cb) cb(cbData)
            }, (err) => { throw err })
            return
          } else throw new Error('Cannot load file that doesn\'t exist. Define defaultData if you want to create it if needed')
        } else throw err
      } else {
        fs.readFile(file, 'utf8', (err, data) => {
          if (err) throw err
          const cbData = this.setData(type, subType, name, JSON.parse(data))
          this.emit(`load ${type} ${subType} ${name}`, cbData)
          if (cb) cb(cbData)
        })
      }
    })
  }

  /**
   * Loads specified data for each channel when the bot joins or leaves one
   * @param type 'static' or 'dynamic' required
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   */
  public autoLoad(type: 'static' | 'dynamic', name: string, defaultData: null | object) {
    this.autoLoads.push({type, name, defaultData})
  }

  private onJoin(raw: IrcMessage, channel: string) {
    for (const autoLoad of this.autoLoads) {
      if (!this[autoLoad.type][channel]) this[autoLoad.type][channel] = {}
      if (!this[autoLoad.type][channel][autoLoad.name]) {
        this.load(autoLoad.type, channel, autoLoad.name, autoLoad.defaultData)
      }
    }
  }

  private onPart(raw: IrcMessage, channel: string) {
    for (const autoLoad of this.autoLoads) {
      if (!this[autoLoad.type][channel]) this[autoLoad.type][channel] = {}
      if (this[autoLoad.type][channel][autoLoad.name]) {
        this.save(autoLoad.type, channel, autoLoad.name, true).then(() => {}, (err) => {
          console.log(`[Data.autoLoad] Error unloading ${channel}`, err)
        })
      }
    }
  }
}
