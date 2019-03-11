import * as fs from 'fs'

export interface ChannelData {
  /** This data changes when events happen */
  static: {global: {[x: string]: any}, [x: string]: {[x: string]: any}},
  /** This data changes all the time but is only saved on exit */
  dynamic: {global: {[x: string]: any}, [x: string]: {[x: string]: any}}
}
export default class Data  {

  /** This data changes when events happen */
  public static: {global: {[x: string]: any}, [x: string]: {[x: string]: any}}
  /** This data changes all the time but is only saved on exit */
  public dynamic: {global: {[x: string]: any}, [x: string]: {[x: string]: any}}

  constructor() {
    this.static = {global: {}}
    this.dynamic = {global: {}}
  }

  public loadStatic(name: string, defaultData: null | {[x: string]: any}, cb: (data: {[x: string]: any}) => void) {
    if (this.static[name]) throw (new Error(`${name} has already been loaded by another source`))
    this.getFile(`./data/static/${name}.json`, defaultData, cb)
  }
  public loadDynamic(name: string, defaultData: null | {[x: string]: any} , cb: (data: {[x: string]: any}) => void) {
    if (this.dynamic[name]) throw (new Error(`${name} has already been loaded by another source`))
    this.getFile(`./data/dynamic/${name}.json`, defaultData, cb)
  }

  private getFile(file: string, defaultData: null | {[x: string]: any}, cb: (data: object) => void): void {
    // tslint:disable-next-line: no-bitwise
    fs.access(file, fs.constants.F_OK | fs.constants.W_OK, (err) => {
      if (err) {
        if (err.code === 'ENOENT') fs.writeFileSync(file, defaultData)
        else throw err
      } else {
        fs.readFile(file, (err, data) => {
          if (err) throw err
          if (typeof data !== 'string') throw new Error('File must be in string/JSON format')
          cb(JSON.parse(data))
        })
      }
    })
  }
}
