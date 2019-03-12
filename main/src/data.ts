import * as fs from 'fs'

export default class Data  {

  /** This data changes when events happen */
  public static: {[x: string]: {[x: string]: any}}
  /** This data changes all the time but is only saved on exit */
  public dynamic: {[x: string]: {[x: string]: any}}

  constructor() {
    if (!fs.existsSync('./main/data/')) fs.mkdirSync('./main/data/')
    if (!fs.existsSync('./main/data/static')) fs.mkdirSync('./main/data/static')
    if (!fs.existsSync('./main/data/dynamic')) fs.mkdirSync('./main/data/dynamic')

    this.static = {}
    this.dynamic = {}
  }

  public saveAllSync() {
    for (const subType in this.static) {
      for (const name in this.static[subType]) {
        fs.writeFileSync(`./main/data/static/${subType}/${name}.json`, JSON.stringify(this.static[subType][name], null, 2))
      }}
    for (const subType in this.dynamic) {
      for (const name in this.dynamic[subType]) {
        fs.writeFileSync(`./main/data/dynamic/${subType}/${name}.json`, JSON.stringify(this.dynamic[subType][name], null, 2))
      }}
  }

  /**
   * Saves a file in ./main/data/`type`/`subFolder`/`name`
   * @param type 'static' or 'dynamic' required
   * @param subType #channel, 'global' or something else
   * @param name file name
   * @param unload Unload from memory if save is succesful
   * @param cb Callback with error
   */
  public save(type: 'static' | 'dynamic', subType: string, name: string, unload: boolean, cb: (err: NodeJS.ErrnoException) => void) {
    if (!this.static[name]) console.error(`${name} isn't loaded and is therefore not saved`)
    fs.writeFile(`./main/data/${type}/${subType}/${name}.json`, JSON.stringify(this[type][subType][name], null, 2), (err) => {
      if (!err && unload) this[type][subType][name] = undefined
      cb(err)
    })
  }

  /**
   * Loads a file in ./main/data/`type`/`subFolder`/`name`
   * @param type 'static' or 'dynamic' required
   * @param subType #channel, 'global' or something else
   * @param name file name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param cb Callback with data
   */
  public load(type: 'static' | 'dynamic', subType: string, name: string, defaultData: null | object , cb?: (data: object) => void) {
    if (!this[type][subType]) this[type][subType] = {}
    if (this[type][subType][name]) throw (new Error(`${name} has already been loaded by another source`))

    const file = `./main/data/${type}/${subType}/${name}.json`
    // tslint:disable-next-line: no-bitwise
    fs.access(file, fs.constants.F_OK | fs.constants.W_OK, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          if (defaultData !== null) {
            const pathOnly = file.slice(0, file.lastIndexOf('/'))
            if (!fs.existsSync(pathOnly)) fs.mkdirSync(pathOnly, {recursive: true})
            fs.writeFile(file, JSON.stringify(defaultData, null, 2), () => {
              if (cb) cb(this[type][subType][name] = defaultData)
            })
            return
          } else throw new Error('Cannot load file that doesn\'t exist. Define defaultData if you want to create it if needed')
        } else throw err
      } else {
        fs.readFile(file, 'utf8', (err, data) => {
          if (err) throw err
          if (typeof data !== 'string') throw new Error('File must be in string/JSON format')
          if (cb) cb(this[type][subType][name] = JSON.parse(data))
        })
      }
    })
  }
}
