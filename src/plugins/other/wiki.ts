import https from 'https'

import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'wiki',
  title: 'Wiki',
  description: 'Gets summaries of subjects from Wikipedia',
  default: {
    alias: '?wiki',
    options: {
      cooldown: 30,
      userCooldown: 60,
    },
  },
  help: ['Get the Wikipedia summary of a subject: {command} <subject...>'],
  disableMention: true,
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '<subject...>', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_subject]: [string[]] = params
    const subject = _subject.join(' ')

    try {
      const data = await this.wiki(subject)
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
      return `Error occurred: ${err.name}`
    }
  }

  public wiki(subject: string): Promise<{[x: string]: any} | string> {
    let redirects = 0
    return get.bind(this)(subject)

    function get(this: Instance, subject: string): Promise<any> {
      return new Promise((resolve) => {
        const options = {
          host: 'en.wikipedia.org',
          path: `/api/rest_v1/page/summary/${encodeURIComponent(subject)}`,
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
            }).on('error', (err) => { throw err })
          } else if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            redirects++
            if (redirects > 3) resolve('Too many redirects')
            else if (res.headers.location) get.bind(this)(res.headers.location).then(resolve)
            else resolve(`${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
          } else {
            resolve(`${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
          }
        })
      })
    }
  }
}
