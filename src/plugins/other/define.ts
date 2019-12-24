import https from 'https'

import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'define',
  title: 'Define',
  description: 'Gets the definition of a term from Oxford Dictionary',
  default: {
    alias: '?define',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Get the definition of term: {alias} <term...>'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private appId?: null | string
  private appKey?: null | string

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.appId = this.l.getKey('oxfordDictionary', 'app_id')
    this.appKey = this.l.getKey('oxfordDictionary', 'app_key')
    if (typeof this.appId !== 'string' || typeof this.appKey !== 'string') {
      console.error('[define] Disabled due to the lack of API keys for Oxford Dictionary')
    }

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<term...>', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_term]: [string[]] = params
    const term = _term.join(' ')

    if (typeof this.appId !== 'string' || typeof this.appKey !== 'string') return 'This command is disabled due to the lack of API keys'

    try {
      const data = await this.define(term, 'en-gb', this.appId, this.appKey)
      if (typeof data !== 'object' || !Array.isArray(data.results)) {
        if (typeof data === 'string') return this.l.u.cap(data.toLowerCase())
        return 'The API returned invalid data'
      }

      let definition
      let pronun // pronunciation
      let category // noun, verb etc
      const word = data.results[0].word

      const entry = (data.results[0].lexicalEntries || {})[0] || {} ? data.results[0].lexicalEntries[0] : {}

      if ((((((entry.entries || {})[0] || {}).senses || {})[0] || {}).definitions || {})[0]) {
        definition = data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0]
        definition = definition.charAt(0) === '(' ? this.l.u.cap(definition, 1) : this.l.u.cap(definition) // Capitalize leading char
      }

      if (((entry.pronunciations || {})[0] || {}).phoneticSpelling) {
        pronun = `/${data.results[0].lexicalEntries[0].pronunciations[0].phoneticSpelling}/ `
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
      return `Error occurred: ${err.name}`
    }
  }

  public define(term: string, lang: string, appId: string, appKey: string): Promise<string | { [x: string]: any }> {
    return new Promise((resolve, reject) => {
      const options = {
        host: 'od-api.oxforddictionaries.com',
        port: 443,
        path: `/api/v2/entries/${lang}/${encodeURIComponent(term)}`,
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
