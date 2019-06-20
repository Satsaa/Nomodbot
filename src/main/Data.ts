import { EventEmitter } from 'events'
import * as fs from 'fs'
import { promises as fsp } from 'fs'

import TwitchClient from './client/Client'
import defaultKeys from './lib/defaultKeys'

export default class Data extends EventEmitter {
  /** This data changes when events happen */
  public data: {[subType: string]: {[name: string]: {[x: string]: any}}}

  public dataPath: string
  /** Reserved data names. No data can be loaded or autoloaded with one of these names */
  private reserved: string[]
  private client: TwitchClient
  /** Loading data to these files are blocked and throws */
  private blocks: {[subType: string]: {[name: string]: true}}
  private autoLoads: Array<{name: string, defaultData?: object, setDefaults?: boolean}>

  constructor(client: TwitchClient, dataRoot: string, reserved = ['']) {
    super()
    this.data = {}

    this.dataPath = dataRoot
    if (!fs.existsSync(dataRoot))
      fs.mkdirSync(dataRoot)

    this.reserved = reserved

    this.client = client
    this.client.on('join', this.onJoin.bind(this))
    this.client.on('part', this.onPart.bind(this))

    this.blocks = {}
    this.autoLoads = []
  }

  /** Returns the path to the data file */
  public getPath(subType: string | number, name: string, fileType: string = 'json') {
    return `${this.dataPath}/${subType}/${name}.${fileType}`
  }

  /**
   * Returns the data or undefined if it isn't loaded.
   * Data will be an object and therefore a reference, so keep that it mind. The undefined value is not a reference
   */
  public getData(subType: string | number, name: string): { [x: string]: any;} | void {
    if ((this.data[subType] || {})[name])
      return this.data[subType][name]
  }
  /** Sets the data variable to `value` */
  public setData(subType: string | number, name: string, value: object) {
    if (!this.data[subType])
      this.data[subType] = {}
    this.data[subType][name] = value
  }

  /** Wait until the data is loaded. Resolves with the data or undefined if timedout */
  public waitData(subType: string | number, name: string, timeout?: number): Promise<object | undefined> {
    return new Promise((resolve) => {
      const data = this.getData(subType, name)
      if (data) {
        resolve(data)
        return
      }

      const cbFunc = (s?: string, n?: string, data?: object) => {
        if (s && n) {
          if (s !== subType || n !== name)
            return
        }
        this.removeListener('load', cbFunc)
        clearTimeout(_timeout)
        resolve(data)
      }
      let _timeout: number
      if (timeout !== undefined)
        _timeout = setTimeout(cbFunc, timeout)
      this.on('load', cbFunc)
    })
  }

  public saveAllSync() {
    for (const subType in this.data) {
      for (const name in this.data[subType]) {
        const data = this.getData(subType, name)
        if (typeof data === 'object' && data !== null)
          fs.writeFileSync(`${this.dataPath}/${subType}/${name}.json`, JSON.stringify(data, null, 0))
        else
          console.error(new Error(`Failed to save ${subType}\\${name} because it's type was ${typeof data}`))
      }
    }
  }

  /**
   * Saves a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'
   * @param name File name
   * @param unload Unload from memory if save is succesful
   */
  public async save(subType: string | number, name: string, unload: boolean = false) {
    const data = this.getData(subType, name)
    if (typeof data !== 'object' || data === null) {
      console.error(new Error(`Failed to save ${subType}\\${name} because it's type was ${typeof data}`))
      return false
    }
    try {
      await fsp.writeFile(`${this.dataPath}/${subType}/${name}.json`, JSON.stringify(data, null, 2))
      if (unload)
        this.delData(subType, name)
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
  public async reload(subType: string | number, name: string, save: boolean = false) {
    if (save)
      await this.save(subType, name)
    if (!this.getData(subType, name))
      throw new Error(`${name} cannot be reloaded as it is not loaded`)
    this.delData(subType, name)
    return this.load(subType, name)
  }

  /**
   * Loads a file in `Data.dataPath`/`subType`/`name`
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Sets all undefined keys in the returned data that exist in `defaultData` to the value of `defaultData`
   */
  public async load(subType: string | number, name: string, defaultData?: object, setDefaults = false): Promise<object> {
    if (!this.data[subType])
      this.data[subType] = {}
    if ((String(subType)).length === 0 || name.length === 0)
      throw new Error('subType and name must not be zero-length')
    if (this.reserved.includes(name))
      throw new Error(`${name} is reserved for internal functions`)
    if (this.getData(subType, name))
      throw new Error(`${name} has already been loaded by another source`)
    this.blockLoad(subType, name)

    const file = `${this.dataPath}/${subType}/${name}.json`
    try { // Check if file is already created
      await fsp.access(file, fs.constants.F_OK)
    } catch (err) {
      if (err.code !== 'ENOENT')
        throw err
      if (defaultData) {
        const pathOnly = file.slice(0, file.lastIndexOf('/'))
        try { // Ensure directory exists
          await fsp.access(file, fs.constants.F_OK)
        } catch (err) {
          if (err.code !== 'ENOENT')
            throw err
          await fsp.mkdir(pathOnly, { recursive: true })
        }

        this.setData(subType, name, defaultData)
        this.emit('load', subType, name, defaultData)
        this.save(subType, name).catch((err) => {
          throw err
        })
        return defaultData
      } else {
        throw new Error('Cannot load file that doesn\'t exist. Define defaultData if you want to create it if needed')
      }
    }

    let data
    try {
      data = JSON.parse(await fsp.readFile(file, 'utf8'))
    } catch (err) {
      throw new Error(`${file} is corrupted: ${err.name}`)
    }
    if (typeof data !== 'object')
      throw new Error(`Wrong data type in file: ${typeof data}`)
    if (setDefaults)
      defaultKeys(data, defaultData || {})
    if (typeof data !== 'object')
      throw new Error(`Data became corrupted: ${typeof data}`)

    this.setData(subType, name, data)
    this.emit('load', subType, name, data)
    return data
  }

  /**
   * Loads or unloads specified data for each channel when the bot joins or parts one
   * Also loads for each channel that the bot has already joined
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Define all keys of the loaded data that exist in `defaultData` with the default value
   */
  public autoLoad(name: string, defaultData: object, setDefaults = false) {
    if (this.reserved.includes(name))
      throw new Error(`${name} is reserved for internal functions`)
    for (const autoLoad of this.autoLoads) {
      if (autoLoad.name === name)
        throw new Error('Duplicate autoLoad for the same data')
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
        const returnVal = this.autoLoads.splice(i, 1),
              savePromises = []
        for (const channel in this.client.clientData.channels) { // Load for present channels
          savePromises.push(this.save(channel, name, true))
        }
        await Promise.all(savePromises)
        return returnVal
      }
    }
    throw new Error('Data is not loaded')
  }

  /** Delete the data */
  private delData(subType: string | number, name: string) {
    this.blockLoad(subType, name, true)
    if (this.data[subType])
      delete this.data[subType][name]
  }

  /** Blocks or unblocks the loading of a data type. Attempting to load a blocked data type will throw as a duplicate */
  private blockLoad(subType: string | number, name: string, unblock = false) {
    if (unblock) {
      if (!this.blocks[subType])
        return
      delete this.blocks[subType][name]
    } else {
      if (!this.blocks[subType])
        this.blocks[subType] = {}
      this.blocks[subType][name] = true
    }
  }

  private onJoin(channelId: number) {
    for (const autoLoad of this.autoLoads) {
      if (!this.data[channelId] || typeof this.data[channelId][autoLoad.name] !== 'object')
        this.load(channelId, autoLoad.name, autoLoad.defaultData, autoLoad.setDefaults)
    }
  }

  private onPart(channelId: number) {
    for (const autoLoad of this.autoLoads) {
      if (this.data[channelId] && typeof this.data[channelId][autoLoad.name] === 'object') {
        this.save(channelId, autoLoad.name, true).then(undefined, (err) => {
          console.log(`[Data.autoLoad] Error unloading ${channelId}`, err)
        })
      } else {
        console.warn(`Already unloaded: ${channelId}/${autoLoad.name}`)
      }
    }
  }
}
