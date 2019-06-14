import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import defaultKeys from '../../main/lib/defaultKeys'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'controller',
  id: 'lists',
  title: 'Lists',
  description: 'Used to make and handle arrays of data. Like a list of quotes',
  creates: [['global', 'listData'], ['listData']],
}

export interface ListsExtension {
  /**
   * Gets list instance of `channelId` based on `listName`  
   * All functions return [usedIndex(one-based), valueOfEntry]  
   * Use unSafe = true to disable out of bounds index to valid index conversion  
   * 
   * ALL LISTS USE ONE BASED INDEXING  
   * NEGATIVE INDEXES RETURN THE NTH LAST ENTRY  
   * ALL INDEXES WILL RETURN A VALID ENTRY  
   * WITH `unSafe` ONLY INDEXES WITHIN THE LIST LENGTH RETURN AN ENTRY  
   * 
   * In a 10 length list  
   * `getEntry(5) => [5, entries[4]]`  
   * `getEntry(-2) => [9, entries[8]]`  
   * `getEntry(-99) => [1, entries[0]]`  
   * `getEntry(0) => [1, entries[0]]`  
   * `getEntry(99) => [10, entries[9]]`  
   * 
   * `unSafe` = true
   * `getEntry(3, true) => [3, entries[2]]`  
   * `getEntry(99, true) => [falsy, undefined]`  
   * `getEntry(-2, true) => [falsy, undefined]`  
   * `getEntry(0, true) => [falsy, undefined]`  
   */
  getList: <T2, T = T2>(listName: string, channelId: number, defaultData?: T2[], setDefaults?: boolean) => List<T> | undefined,
  getGlobalList: <T2, T = T2>(listName: string, defaultData?: T2[], setDefaults?: boolean) => List<T> | undefined,
}

interface ListsType {
  channels: { [id: number]: {[listName: string]: any[]} },
  globals: { [listName: string]: any[] },
}

interface ListData {
  [listName: string]: any[]
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.l.load('global', 'listData', {})
    this.l.autoLoad('listData', {})
  }

  public async init(): Promise<void> {
    const extensions: ListsExtension = {
      getList: (listName: string, channelId: number, defaultData: any[] = [], setDefaults = false) => {
        const data = this.l.getData(channelId, 'listData') as ListData
        if (!data) return
        if (!data[listName]) data[listName] = defaultData
        if (setDefaults) defaultKeys(data[listName], defaultData)
        return new List(data[listName], this.l)
      },
      getGlobalList: (listName: string, defaultData: any[] = [], setDefaults = false) => {
        const data = this.l.getData('global', 'listData') as ListData
        if (!data) return
        if (!data[listName]) data[listName] = defaultData
        if (setDefaults) defaultKeys(data[listName], defaultData)
        return new List(data[listName], this.l)
      },
    }
    this.l.extend(options.id, extensions)
  }

  public async unload() {
    this.l.unextend(options.id)
  }
}

class List<T = string> {

  public entries: T[]
  private l: PluginLibrary

  constructor(list: T[], l: PluginLibrary) {
    this.entries = list
    this.l = l
  }

  /** Gets a random array entry */
  public randomEntry(): [number, T] {
    const zero = this.l.u.randomInt(0, this.entries.length - 1)
    return [zero + 1, this.entries[zero]]
  }

  public getEntry(index: number, unSafe: true): [number, T | undefined]
  public getEntry(index: number, unSafe?: false): [number, T]
  /** Gets an array entry */
  public getEntry(index: number, unSafe = false): [number, T | undefined] {
    index = Math.floor(index)
    if (unSafe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    return [zero + 1, this.entries[zero]]
  }

  public delEntry(index: number, unSafe: true): [number, T | undefined]
  public delEntry(index: number, unSafe?: false): [number, T | undefined]
  /** Removes an array entry if the list is not empty */
  public delEntry(index: number, unSafe = false): [number, T | undefined] {
    index = Math.floor(index)
    if (unSafe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    if (!this.entries.length) return [0, undefined]
    return [zero + 1, this.entries.splice(zero, 1)[0]]
  }

  public setEntry(index: number, value: T, unSafe: true): [number, T | undefined]
  public setEntry(index: number, value: T, unSafe?: false): [number, T]
  /** Sets the value of an array entry */
  public setEntry(index: number, value: T, unSafe = false): [number, T | undefined] {
    index = Math.floor(index)
    if (unSafe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    return [zero + 1, this.entries[zero] = value]
  }

  public insertEntry(index: number, value: T, unSafe: true): [number, T | undefined]
  public insertEntry(index: number, value: T, unSafe?: false): [number, T]
  /** Inserts an array entry */
  public insertEntry(index: number, value: T, unSafe = false): [number, T | undefined] {
    index = Math.floor(index)
    if (unSafe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    return [zero + 1, this.entries.splice(zero, 0, value)[0]]
  }

  /** Adds an entry at the end of entries */
  public pushEntry(value: T): [number, T] {
    return [this.entries.push(value), this.entries[this.entries.length - 1]]
  }

  /** Whether or not the index is within the bounds of entries */
  public isUnsafe(index: number) {
    index = Math.floor(index)
    return index < 1 || index > this.entries.length
  }

  private getIndex(inputIndex: number) {
    return this.l.u.smartIndex(inputIndex, this.entries)
  }
}
