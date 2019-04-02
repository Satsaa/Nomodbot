import { EventEmitter } from 'events'
import * as fs from 'fs'
import { promises as fsp } from 'fs'
import TwitchClient from './lib/Client'
import defaultKeys from './lib/defaultKeys'

export default class Data extends EventEmitter {

  /** This data changes when events happen */
  public data: {[x: string]: {[x: string]: any}}

  public dataPath: string
  private client: TwitchClient
  private autoLoads: Array<{name: string, defaultData?: object, setDefaults?: boolean}>

  constructor(client: TwitchClient, dataPath: string) {
    super()
    this.dataPath = dataPath.endsWith('/') ? dataPath : dataPath + '/'

    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath)

    this.client = client
    this.client.on('join', this.onJoin.bind(this))
    this.client.on('part', this.onPart.bind(this))

    this.data = {}

    this.autoLoads = []
  }

  /** Returns the path to the data file */
  public getPath(subType: string, name: string, fileType: string = 'json') {
    return `${this.dataPath}${subType}/${name}.${fileType}`
  }

  /**
   * Returns the data or undefined if it isn't loaded.  
   * Data will be an object and therefore a reference, so keep that it mind. The undefined value is not a reference
   */
  public getData(subType: string, name: string) {
    if ((this.data[subType] || {})[name]) return this.data[subType][name]
    return
  }
  /** Sets the data variable to `value` */
  public setData(subType: string, name: string, value: object) {
    if (!this.data[subType]) this.data[subType] = {}
    return this.data[subType][name] = value
  }
  /** Delete the data */
  public delData(subType: string, name: string) {
    if (!this.getData(subType, name)) return false
    delete this.data[subType][name]
    return true
  }

  /** Wait until the data is loaded. Resolves with the arguments the event gives or undefined if timedout */
  public async waitData(subType: string, name: string, timeout?: number): Promise<object | undefined> {
    if (this.getData(subType, name)) return this.getData(subType, name)
    return new Promise((resolve) => {
      const cbFunc = (s?: string, n?: string, data?: object) => {
        if (s && n) if (s !== subType || n !== name) return
        this.removeListener('load', cbFunc)
        clearTimeout(_timeout)
        resolve(data)
      }
      let _timeout: number
      if (timeout !== undefined) _timeout = setTimeout(cbFunc, timeout)
      this.on('load', cbFunc)
    })
  }

  public saveAllSync() {
    for (const subType in this.data) {
      for (const name in this.data[subType]) {
        const data  = this.getData(subType, name)
        if (!data) {
          console.error(`Failed to save ${subType}\\${name} because it was undefined`)
          continue
        }
        fs.writeFileSync(`${this.dataPath}${subType}/${name}.json`, JSON.stringify(data, null, 2))
      }
    }
  }

  /**
   * Saves a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'
   * @param name File name
   * @param unload Unload from memory if save is succesful
   */
  public async save(subType: string, name: string, unload: boolean = false) {
    const data = this.getData(subType, name)
    if (!data) {
      console.error(`${name} isn't loaded and is therefore not saved`)
      return false
    }
    try {
      await fsp.writeFile(`${this.dataPath}${subType}/${name}.json`, JSON.stringify(data, null, 2))
      if (unload) this.delData(subType, name)
      return true
    } catch (err) {
      console.log(`Could not save ${name}:`, err)
      return false
    }
  }

  /**
   * Reloads a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'.
   * @param name File name
   * @param save Save before reloading
   */
  public async reload(subType: string, name: string, save: boolean = false) {
    if (save) await this.save(subType, name)
    if (!this.getData(subType, name)) throw new Error(`${name} cannot be reloaded as it is not loaded`)
    this.delData(subType, name)
    return this.load(subType, name)
  }

  /**
   * Loads a file in `Data.dataPath`/`subType`/`name`
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Sets all undefined keys in the returned data that exist in `defaultData` to the value of `defaultData`
   */
  public async load(subType: string, name: string, defaultData?: object, setDefaults = false): Promise<object> {
    if (!this.data[subType]) this.data[subType] = {}
    if (this.getData(subType, name)) throw new Error(`${name} has already been loaded by another source`)
    this.setData(subType, name, {}) // Blocks new loads on this data type
    const file = `${this.dataPath}${subType}/${name}.json`
    try { // Check if file is already created
      await fsp.access(file, fs.constants.F_OK)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      if (defaultData) {
        const pathOnly = file.slice(0, file.lastIndexOf('/'))
        try { // Ensure directory exists
          await fsp.access(file, fs.constants.F_OK)
        } catch (err) {
          if (err.code !== 'ENOENT') throw err
          await fsp.mkdir(pathOnly, {recursive: true})
        }
        const result = this.setData(subType, name, defaultData)
        this.emit('load', subType, name, result)
        this.save(subType, name).catch((err) => { throw err })
        return result
      } else throw new Error('Cannot load file that doesn\'t exist. Define defaultData if you want to create it if needed')
    }
    let data
    try { data = JSON.parse(await fsp.readFile(file, 'utf8'))
    } catch (err) { throw new Error(`${file} is corrupted: ${err.name}`) }
    if (setDefaults) defaultKeys(data, defaultData || {})
    const result = this.setData(subType, name, data)
    this.emit('load', subType, name, result)
    return result
  }

  /**
   * Loads or unloads specified data for each channel when the bot joins or parts one  
   * Also loads for each channel that the bot has already joined
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Define all keys of the loaded data that exist in `defaultData` with the default value
   */
  public autoLoad(name: string, defaultData?: object, setDefaults = false) {
    for (const channel in this.client.clientData.channels) { // Load for present channels
      this.load(channel, name, defaultData, setDefaults)
    }
    this.autoLoads.push({name, defaultData, setDefaults})
  }

  private onJoin(channel: string) {
    for (const autoLoad of this.autoLoads) {
      if (!(this.data[channel] || {})[autoLoad.name]) {
        this.load(channel, autoLoad.name, autoLoad.defaultData, autoLoad.setDefaults)
      }
    }
  }

  private onPart(channel: string) {
    for (const autoLoad of this.autoLoads) {
      if ((this.data[channel] || {})[autoLoad.name]) {
        this.save(channel, autoLoad.name, true).then(() => {}, (err) => {
          console.log(`[Data.autoLoad] Error unloading ${channel}`, err)
        })
      }
    }
  }
}
