import { PluginInstance, PluginOptions } from '../../src/Commander'
import defaultKeys from '../../src/lib/defaultKeys'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'controller',
  id: 'lists',
  name: 'Lists',
  description: 'Used to make and handle arrays of data. Like a list of quotes',
  creates: [['global', 'listData']],
}

export interface ListsExtension {
  /**
   * Gets a global or `channel` list instance based on `pluginId`  
   * All functions return [usedIndex(one-based), valueOfEntry]  
   * Use safe = true to disable out of bounds to valid index conversion  
   * 
   * ALL LISTS USE ONE BASED INDEXING  
   * NEGATIVE INDEXES RETURN THE NTH LAST INDEXES  
   * NO INPUTTED INDEX IS INVALID  
   * INPUT INDEX IS RESTRICTED TO VALID INDEXES
   * 
   * In a 10 length list  
   * `getEntry(5) => [5, entries[4]]`  
   * `getEntry(-2) => [9, entries[8]]`  
   * `getEntry(-99) => [1, entries[0]]`  
   * `getEntry(0) => [1, entries[0]]`  
   * `getEntry(99) => [10, entries[9]]`  
   * 
   * `getEntry(3, true) => [3, entries[2]]`  
   * `getEntry(99, true) => [falsy, undefined]`  
   * `getEntry(-2, true) => [falsy, undefined]`  
   * `getEntry(0, true) => [falsy, undefined]`  
   */
  // tslint:disable-next-line: bool-param-default // Cant set initializers here?
  getList: (pluginId: string, channel?: string, defaultData?: any[], setDefaults?: boolean) => List,
}

interface ListsType {
  channels: { [channel: string]: {[pluginId: string]: any[]} },
  globals: { [pluginId: string]: any[] },
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private lists: ListsType

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.lists = { channels: {}, globals: {} }

  }

  public async init(): Promise<void> {
    this.lists = await this.l.load('global', 'listData', {channels: {}, globals: {}}, true) as ListsType
    const extensions: ListsExtension = {
      getList: (pluginId: string, channel?: string, defaultData: any[] = [], setDefaults = false) => {
        if (channel) { // Channel list
          if (!this.lists.channels[channel]) this.lists.channels[channel] = {}
          if (!this.lists.channels[channel][pluginId]) this.lists.channels[channel][pluginId] = defaultData
          if (setDefaults) defaultKeys(this.lists.channels[channel][pluginId], defaultData)
          return new List(pluginId, this.lists.channels[channel], this.l)
        } else { // Global list
          if (!this.lists.globals[pluginId]) this.lists.globals[pluginId] = defaultData
          if (setDefaults) defaultKeys(this.lists.globals[pluginId], defaultData)
          return new List(pluginId, this.lists.globals, this.l)
        }
      },
    }
    this.l.extend(options.id, extensions)
  }
}

class List {

  public get entries(): List['baseList'][List['pluginId']] {
    return this.baseList[this.pluginId]
  }
  public pluginId: string
  private baseList: {[pluginId: string]: any[]}
  private l: PluginLibrary

  constructor(pluginId: string, baseList: {[pluginId: string]: any[]}, l: PluginLibrary) {
    this.pluginId = pluginId
    this.baseList = baseList
    this.l = l
  }

  /** Gets a random array entry */
  public randomEntry(): [number, any] {
    const zero = this.l.u.randomInt(0, this.entries.length - 1)
    return [zero + 1, this.entries[zero]]
  }

  /** Gets an array entry */
  public getEntry(index: number, safe = false): [number, any] {
    if (safe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    return [zero + 1, this.entries[zero]]
  }

  /** Removes an array entry */
  public delEntry(index: number, safe = false): [number, any] {
    if (safe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    return this.entries.splice(zero, 1)[0]
  }

  /** Sets the value of an array entry */
  public setEntry(index: number, value: any, safe = false): [number, any] {
    if (safe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    return [zero + 1, this.entries[zero] = value]
  }

  /** Inserts an array entry */
  public insertEntry(index: number, value: any, safe = false): [number, any] {
    if (safe && this.isUnsafe(index)) return [0, undefined]
    const zero = this.getIndex(index)
    return [zero + 1, this.entries.splice(zero, 0, value)]
  }

  /** Adds an entry at the end of entries */
  public pushEntry(value: any): [number, any] {
    return [this.entries.push(value), this.entries[this.entries.length - 1]]
  }

  /** Whether or not the index is within the bounds of entries */
  public isUnsafe(index: number) {
    return index < 1 || index > this.entries.length
  }

  private getIndex(inputIndex: number) {
    return this.l.u.smartIndex(inputIndex, this.entries)
  }
}
