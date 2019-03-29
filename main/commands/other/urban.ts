import https from 'https'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'urban',
  name: 'Urban',
  description: 'Gets the Urban Disctionary definition of something',
  default: {
    alias: '?urban',
    options: {
      permissions: 1,
      cooldown: 10,
      userCooldown: 60,
    },
  },
  help: '{alias} <search...>: Get the urban definition of search',
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, userstate: object, message: string, params: string[], me: boolean) {
    // tslint:disable: align
    try {
      const res = await getUrban(params.slice(1).join(' '))
      if (res.list.length === 0) {
        return 'No Urban definition found'
      }
      const def = res.list[0]
      const word = this.l.u.cap(def.word)
      const definition = this.l.u.endPunctuate(def.definition).replace(/\[.*?\]/g, this.tidyBrackets.bind(this))
      const example = this.l.u.endPunctuate(def.example).replace(/\[.*?\]/g, this.tidyBrackets.bind(this))
      const good = def.thumbs_up
      const bad = def.thumbs_down
      const link = def.permalink.replace('http://', '').replace(/^[a-zA-Z0-9]*\./, '')
      const dateStr = this.l.u.dateString(Date.parse(def.written_on))

      return this.l.u.fitStrings(this.l.maxMsgLength,
        [`[${this.l.u.fontify(word, 'mathSansBold')}]`, 5],
        [definition, 1],
        [`𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${example}`, 0],
        [`⮝${good} ⮟${bad}`, 3],
        [`${link}`, 4],
        [`${dateStr}`, 2],
        )
    } catch (err) {
      console.error(err)
      return typeof err === 'number' ? `Status code: ${err}` : undefined
    }
  }

  private tidyBrackets(match: string) {
    return this.l.u.fontify(match.substring(1, match.length - 1), 'mathSansBold')
  }
}

function getUrban(terms: string): Promise<{[x: string]: any}> {
  return new Promise((resolve, reject) => {
    const options = terms.length ? {
      host: 'api.urbandictionary.com',
      path: '/v0/define?term=' + encodeURIComponent(terms),
      headers: {
        Accept: 'application/json',
      },
    } : {
      host: 'api.urbandictionary.com',
      path: '/v0/random',
      headers: {
        Accept: 'application/json',
      },
    }

    https.get(options, (res) => {
      if (res.statusCode === 200) {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        }).on('end', () => {
          resolve(JSON.parse(data))
        }).on('error', (err) => {
          reject(err)
        })
      } else {
        reject(res.statusCode)
      }
    })
  })
}
