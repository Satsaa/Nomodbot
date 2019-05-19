import https from 'https'
import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'wiki',
  name: 'Wiki',
  description: 'Gets summaries of subjects from Wikipedia',
  default: {
    alias: '?wiki',
    options: {
      cooldown: 30,
      userCooldown: 90,
    },
  },
  help: ['Get the Wikipedia summary of a subject: {command} <subject...>'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    if (!params[1]) return 'Define something to search (params 1+)'

    const words = params.slice(1).join(' ')
    try {
      const data = await this.wiki(words)
      if (typeof data !== 'object') {
        if (typeof data === 'string') return this.l.u.cap(data.toLowerCase())
        return 'The API returned invalid data'
      }

      if (data.type === 'disambiguation') {
        return this.l.u.fitStrings(Math.min(this.l.maxMsgLength, 200),
          [`[${data.displaytitle}]`, 2], // [title]
          ['Disambiguation', 0], // disambiguations
          [`${data.content_urls.desktop.page.replace('https://', '')}`, 1]) // link
      }

      return this.l.u.fitStrings(Math.min(this.l.maxMsgLength, 200),
        [`[${data.displaytitle}]`, 2], // [title]
        [data.extract, 0], // summary
        [`${data.content_urls.desktop.page.replace('https://', '')}`, 1]) // link

    } catch (err) {
      console.error(err)
      return 'Catastrophic error!'
    }
  }

  public wiki(subject: string): Promise<{[x: string]: any} | string> {
    let redirects = 0
    return get.bind(this)(subject)

    function get(this: Instance, subject: string) {
      return new Promise((resolve, reject) => {
        const options = {
          host: 'en.wikipedia.org',
          path: '/api/rest_v1/page/summary/' + encodeURIComponent(subject),
          headers: {
            accept: 'application/json',
          },
        }

        https.get(options, (res) => {
          if (res.statusCode === 200) {
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            }).on('end', () => {
              const result = JSON.parse(data)
              resolve(result)
            }).on('error', reject)
          } else if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            redirects++
            if (redirects > 3) resolve('Too many redirects')
            else if (res.headers.location) get.bind(this)(res.headers.location).then(resolve, reject)
            else resolve(`${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
          } else resolve(`${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
        })
      })
    }
  }
}
