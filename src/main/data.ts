import { EventEmitter } from 'events'
import * as fs from 'fs'

import * as afs from './lib/atomicFS'
import TwitchClient from './client/client'
import defaultKeys from './lib/defaultKeys'
import logger from './logger'

export default class Data extends EventEmitter {
  /** This data changes when events happen */
  public data: { [group: string]: { [name: string]: { [x: string]: any } } }

  public dataPath: string
  /** Reserved data names. No data can be loaded or autoloaded with one of these names */
  private reserved: readonly string[]
  private client: TwitchClient
  /** Loading data to these files are blocked and throws */
  private blocks: { [group: string]: { [name: string]: true } }
  private autoLoads: Array<{ name: string, defaultData?: object, setDefaults?: boolean }>

  constructor(client: TwitchClient, dataRoot: string, reserved = ['']) {
    super()
    this.data = {}

    this.dataPath = dataRoot
    if (!fs.existsSync(dataRoot)) fs.mkdirSync(dataRoot)

    this.reserved = reserved

    this.client = client
    this.client.on('join', this.onJoin.bind(this))
    this.client.on('part', this.onPart.bind(this))

    this.blocks = {}
    this.autoLoads = []
  }

  /** Returns the path to the data file */
  public getPath(group: string | number, name: string, fileType: string = 'json') {
    return `${this.dataPath}/${group}/${name}.${fileType}`
  }

  /**
   * Returns the data or undefined if it isn't loaded.  
   * Data will be an object and therefore a reference, so keep that it mind. The undefined value is not a reference
   */
  public getData(group: string | number, name: string) {
    if ((this.data[group] || {})[name]) return this.data[group][name]
    return undefined
  }
  /** Sets the data variable to `value` */
  public setData(group: string | number, name: string, value: object) {
    if (!this.data[group]) this.data[group] = {}
    this.data[group][name] = value
    return value
  }

  /** Wait until the data is loaded. Resolves with the data or undefined if timedout */
  public async waitData(group: string | number, name: string, timeout?: number): Promise<object | undefined> {
    if (this.getData(group, name)) return this.getData(group, name)
    return new Promise((resolve) => {
      const cbFunc = (s?: string, n?: string, data?: object) => {
        if (s && n) if (s !== group || n !== name) return
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
    for (const group in this.data) {
      for (const name in this.data[group]) {
        const data = this.getData(group, name)
        if (typeof data === 'object') {
          try {
            const path = `${this.dataPath}/${group}/${name}.json`
            const tempPath = `${this.dataPath}/${group}/${name}_temp.json`
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 0))
            fs.renameSync(tempPath, path)
          } catch (err) {
            logger.error(`Failed to save ${group}\\${name}:`)
            logger.error(err)
          }
        } else {
          logger.error(new Error(`Failed to save ${group}\\${name} because it's type was ${typeof data}`))
        }
      }
    }
  }

  /**
   * Saves a file in `Data.dataPath`/`group`/`name`
   * @param group E.g. 'default', 'global'
   * @param name File name
   * @param unload Unload from memory if save is succesful
   */
  public async save(group: string | number, name: string, unload: boolean = false) {
    const data = this.getData(group, name)
    if (typeof data !== 'object') {
      logger.warn(new Error(`Failed to save ${group}\\${name} because it's type was ${typeof data}`))
      return false
    }
    try {
      await afs.writeFile(`${this.dataPath}/${group}/${name}.json`, JSON.stringify(data, null, 0))
      if (unload) this.delData(group, name)
      return true
    } catch (err) {
      logger.warn(`Could not save ${name}:`, err)
      return false
    }
  }

  /**
   * Reloads a file in `Data.dataPath`/`group`/`name`
   * @param group E.g. 'default', 'global'.
   * @param name File name
   * @param save Save before reloading
   */
  public async reload(group: string | number, name: string, save: boolean = false) {
    if (save) await this.save(group, name)
    if (!this.getData(group, name)) throw new Error(`${name} cannot be reloaded as it is not loaded`)
    this.delData(group, name)
    return this.load(group, name)
  }

  /**
   * Loads a file in `Data.dataPath`/`group`/`name`
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Sets all undefined keys in the returned data that exist in `defaultData` to the value of `defaultData`
   */
  public async load(group: string | number, name: string, defaultData?: object, setDefaults = false): Promise<object> {
    if (!this.data[group]) this.data[group] = {}
    if (String(group).length === 0 || name.length === 0) throw new Error('group and name must not be zero-length')
    if (this.reserved.includes(name)) throw new Error(`${name} is reserved for internal functions`)
    if (this.getData(group, name)) throw new Error(`${name} has already been loaded by another source`)
    this.blockLoad(group, name)

    const file = `${this.dataPath}/${group}/${name}.json`
    try { // Check if file is already created
      await afs.access(file, fs.constants.F_OK)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      if (defaultData) {
        const pathOnly = file.slice(0, file.lastIndexOf('/'))
        try { // Ensure directory exists
          await afs.access(file, fs.constants.F_OK)
        } catch (err) {
          if (err.code !== 'ENOENT') throw err
          await afs.mkdir(pathOnly, { recursive: true })
        }

        const result = this.setData(group, name, defaultData)
        this.emit('load', group, name, result)
        this.save(group, name).catch((err) => { throw err })
        return result
      } else {
        throw new Error('Cannot load file that doesn\'t exist. Define defaultData if you want to create it if needed')
      }
    }

    let data
    try {
      data = JSON.parse(await afs.readFile(file, 'utf8'))
    } catch (err) {
      throw new Error(`${file} is corrupted: ${err.name}`)
    }
    if (typeof data !== 'object') throw new Error(`Wrong data type in file: ${typeof data}`)
    if (setDefaults) defaultKeys(data, defaultData || {})
    if (typeof data !== 'object') throw new Error(`Data became corrupted: ${typeof data}`)

    const result = this.setData(group, name, data)
    this.emit('load', group, name, result)
    return result
  }

  /**
   * Loads or unloads specified data for each channel when the bot joins or parts one  
   * Also loads for each channel that the bot has already joined
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Define all keys of the loaded data that exist in `defaultData` with the default value
   */
  public autoLoad(name: string, defaultData: object, setDefaults = false) {
    if (this.reserved.includes(name)) throw new Error(`${name} is reserved for internal functions`)
    for (const autoLoad of this.autoLoads) {
      if (autoLoad.name === name) throw new Error('Duplicate autoLoad for the same data')
    }
    for (const channel in this.client.clientData.channels) { // Load for present channels
      this.load(channel, name, defaultData, setDefaults)
    }
    this.autoLoads.push({ name, defaultData, setDefaults })
  }
  /**
   * Disables the autoLoading of specified data and unloads it  
   * Return the removed autoLoad object
   * @param name File name
   * @param noUnload Whether or not the data is left in memory
   */
  public async unautoLoad(name: string, noUnload = false): Promise<Data['autoLoads']> {
    for (let i = 0; i < this.autoLoads.length; i++) {
      if (this.autoLoads[i].name === name) {
        const returnVal = this.autoLoads.splice(i, 1)
        const savePromises = []
        for (const channelId in this.client.clientData.channels) { // Load for present channels
          savePromises.push(this.save(channelId, name, true))
        }
        await Promise.all(savePromises)
        return returnVal
      }
    }
    throw new Error('Data is not loaded')
  }

  /** Delete the data */
  private delData(group: string | number, name: string) {
    this.blockLoad(group, name, true)
    if (this.data[group]) delete this.data[group][name]
  }

  /** Blocks or unblocks the loading of a data type. Attempting to load a blocked data type will throw as a duplicate */
  private blockLoad(group: string | number, name: string, unblock = false) {
    if (unblock) {
      if (!this.blocks[group]) return
      delete this.blocks[group][name]
    } else {
      if (!this.blocks[group]) this.blocks[group] = {}
      this.blocks[group][name] = true
    }
  }

  private onJoin(channelId: number) {
    for (const autoLoad of this.autoLoads) {
      if (!this.data[channelId] || typeof this.data[channelId][autoLoad.name] !== 'object') {
        this.load(channelId, autoLoad.name, autoLoad.defaultData, autoLoad.setDefaults)
      }
    }
  }

  private onPart(channelId: number) {
    for (const autoLoad of this.autoLoads) {
      if (this.data[channelId] && typeof this.data[channelId][autoLoad.name] === 'object') {
        this.save(channelId, autoLoad.name, true).catch((err) => {
          logger.error(`[Data.autoLoad] Error unloading ${channelId}`, err)
        })
      } else {
        logger.warn(`Data already unloaded: ${channelId}/${autoLoad.name}`)
      }
    }
  }
}
