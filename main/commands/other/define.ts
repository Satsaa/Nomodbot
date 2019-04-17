import https from 'https'
import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'define',
  name: 'Define',
  description: 'Gets the definition of a term from Oxford Dictionary',
  default: {
    alias: '?define',
    options: {
      permissions: 0,
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Get the definition of term: {alias} <term...>'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private appId?: null | string
  private appKey?: null | string

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.appId = this.l.getKey('oxfordDictionary', 'app_id')
    this.appKey = this.l.getKey('oxfordDictionary', 'app_key')
    if (typeof this.appId !== 'string' || typeof this.appKey !== 'string') {
      this.l.disableDefaults(options.id)
      console.error('[define] Disabled due to the lack of API keys for Oxford Dictionary')
    }
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    if (!this.appId || !this.appKey) return
    if (!params[1]) return 'Define something to search (param 1)'

    const words = params.slice(1).join(' ')
    try {
      const data = await this.define(words, 'en-gb', this.appId, this.appKey)
      if (typeof data !== 'object' || !Array.isArray(data.results)) {
        if (typeof data === 'string') return this.l.u.cap(data.toLowerCase())
        return 'The API returned invalid data'
      }

      let definition
      let pronun // pronunciation
      let category // noun, verb etc
      const word = data.results[0].word

      const entry = ((data.results[0].lexicalEntries || {})[0] || {}) ? data.results[0].lexicalEntries[0] : {}

      if ((((((entry.entries || {})[0] || {}).senses || {})[0] || {}).definitions || {})[0]) {
        definition = data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0]
        definition = definition.charAt(0) === '(' ? this.l.u.cap(definition, 1) : this.l.u.cap(definition) // Capitalize leading char
      }

      if (((entry.pronunciations || {})[0] || {}).phoneticSpelling) {
        pronun = '/' + data.results[0].lexicalEntries[0].pronunciations[0].phoneticSpelling + '/ '
      }

      if (entry.lexicalCategory) {
        category = data.results[0].lexicalEntries[0].lexicalCategory.text // noun, verb etc
      }

      definition = definition || 'No definition.'
      pronun = pronun || ''
      category = category || 'Unknown'
      return `[${category} ${pronun}${word}]: ${definition}${definition.endsWith('.') ? '' : '.'}`

    } catch (err) {
      console.error(err)
      return 'Catastrophic error!'
    }
  }

  public define(words: string, lang: string, appId: string, appKey: string): Promise<string | {[x: string]: any}> {
    return new Promise((resolve, reject) => {
      const options = {
        host: 'od-api.oxforddictionaries.com',
        port: 443,
        path: '/api/v2/entries/' + lang + '/' + encodeURIComponent(words),
        method: 'GET',
        headers: {
          accept: 'application/json',
          app_id: appId,
          app_key: appKey,
        },
      }

      https.get(options, (res) => {
        if (res.statusCode === 200) { // success!
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          }).on('end', () => {
            const result = JSON.parse(data)
            resolve(result)
          }).on('error', reject)
        } else {
          resolve(`${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
        }
      })
    })
  }
}
