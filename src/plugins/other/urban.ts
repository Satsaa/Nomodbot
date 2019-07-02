import https from 'https'

import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'urban',
  title: 'Urban',
  description: 'Gets the Urban Disctionary definition of something',
  default: {
    alias: '?urban',
    options: {
      cooldown: 30,
      userCooldown: 60,
      userlvl: userlvls.sub,
    },
  },
  help: [
    'Get a random urban definition: {alias}',
    'Get the urban definition of term: {alias} <term...>',
  ],
  disableMention: true,
}

export class Instance implements PluginInstance {
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    try {
      const data = await this.getUrban(params.slice(1).join(' '))
      if (typeof data !== 'object' || !Array.isArray(data.list)) {
        if (typeof data === 'string') return data
        return 'The API returned invalid data'
      }
      if (data.list.length === 0) return 'No definition found'

      const def = data.list[0]
      const word = this.l.u.cap(def.word)
      const definition = this.l.u.endPunctuate(def.definition).replace(/\[.*?\]/g, this.tidyBrackets.bind(this))
      const example = this.l.u.endPunctuate(def.example).replace(/\[.*?\]/g, this.tidyBrackets.bind(this))
      const good = def.thumbs_up
      const bad = def.thumbs_down
      const link = def.permalink.replace('http://', '').replace(/^[a-zA-Z0-9]*\./, '')
      const dateStr = this.l.u.dateString(Date.parse(def.written_on))

      return this.l.u.fitStrings(Math.min(this.l.maxMsgLength, 200),
        [`[${this.l.u.fontify(word, 'mathSansBold')}]`, 5], // title
        [definition, 1], // definition
        [`𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${example}`, 0], // example
        [`⮝${good} ⮟${bad}`, 3], // votes
        [`${link}`, 4], // link
        [`${dateStr}`, 2], // date
      )
    } catch (err) {
      console.error(err)
      return `Error occurred: ${err.name}`
    }
  }

  public tidyBrackets(match: string) {
    return this.l.u.fontify(match.substring(1, match.length - 1), 'mathSansBold')
  }

  public getUrban(terms: string): Promise<{[x: string]: any} | string> {
    return new Promise((resolve, reject) => {
      const options = terms.length
        ? {
          host: 'api.urbandictionary.com',
          path: `/v0/define?term=${encodeURIComponent(terms)}`,
          headers: { accept: 'application/json' },
        }
        : {
          host: 'api.urbandictionary.com',
          path: '/v0/random',
          headers: { accept: 'application/json' },
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
