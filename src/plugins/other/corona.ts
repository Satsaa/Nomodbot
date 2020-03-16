import https from 'https'

import { Extra, PluginInstance, PluginOptions, Userlvl, AdvancedMessage } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'corona',
  title: 'Corona',
  description: 'Displays global or country-specific corona stats',
  default: {
    alias: '?corona',
    options: {
      cooldown: 10,
      userCooldown: 30,
      userlvl: Userlvl.any,
    },
  },
  help: ['Display todays global or country-specific corona stats: {alias} [<country...>]'],
  disableMention: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private updateTime: number
  private data?: CoronaData


  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<country...>]', this.callMain)

    this.updateTime = 0
    this.getData()
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_country]: [string[]] = params
    const country = _country ? _country.join(' ') : undefined

    try {
      const data = await this.getData(country)
      if (typeof data === 'string') {
        return data
      } else if (country) {
        const stats = data[country.toLowerCase()]
        if (!stats) {
          const res: AdvancedMessage = { segments: ['Can\'t find that country :('], atUser: true }
          return res
        }
        return `Corona stats for ${stats.country} | ` +
          `Cases: ${this.formatNumber(stats.cases)} | Deaths: ${this.formatNumber(stats.deaths)} | Recovered: ${this.formatNumber(stats.recovered)} | ` +
          `Cases today: ${this.formatNumber(stats.todayCases)} | Deaths today: ${this.formatNumber(stats.todayDeaths)}`
      } else {
        const stats = data.global
        return 'Global corona stats | ' +
          `Cases: ${this.formatNumber(stats.cases)} | Deaths: ${this.formatNumber(stats.deaths)} | Recovered: ${this.formatNumber(stats.recovered)} | ` +
          `Cases today: ${this.formatNumber(stats.todayCases)} | Deaths today: ${this.formatNumber(stats.todayDeaths)}`
      }
    } catch (err) {
      console.error(err)
      return `Error occurred: ${err.name}`
    }
  }

  public formatNumber(number: number): string {
    if (!number) return '0'

    const THOUSAND = 1000
    const MILLION = THOUSAND ** 2

    if (number > THOUSAND * 10) {
      if (number > MILLION * 10) {
        return `${Math.round(number / MILLION)}M`
      }
      return `${Math.round(number / THOUSAND)}K`
    }
    return `${number}`
  }


  public async getData(country?: string): Promise<CoronaData | string> {
    if (this.data && Date.now() < this.updateTime) {
      return this.data
    } else {
      return new Promise((resolve, reject) => {
        const options = {
          host: 'corona.lmao.ninja',
          path: '/countries',
          headers: { accept: 'application/json' },
        }

        https.get(options, (res) => {
          if (res.statusCode === 200) { // success!
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            }).on('end', () => {
              const result = JSON.parse(data) as RawData
              this.data = this.process(result)
              resolve(this.data)
              this.updateTime = Date.now() + 1000 * 60 * 60 // Update at most hourly
            }).on('error', reject)
          } else {
            resolve(this.data || `${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
          }
        })
      })
    }
  }

  public process(raw: RawData): CoronaData {
    const res: CoronaData = Object.create(null)

    res.global = {
      country: 'the whole world',
      cases: 0,
      todayCases: 0,
      deaths: 0,
      todayDeaths: 0,
      recovered: 0,
      critical: 0,
    }

    for (const element of raw) {
      res[element.country.toLowerCase()] = {
        country: element.country,
        cases: element.cases || 0,
        todayCases: element.todayCases || 0,
        deaths: element.deaths || 0,
        todayDeaths: element.todayDeaths || 0,
        recovered: element.recovered || 0,
        critical: element.critical || 0,
      }
      res.global.cases += element.cases || 0
      res.global.todayCases += element.todayCases || 0
      res.global.deaths += element.deaths || 0
      res.global.todayDeaths += element.todayDeaths || 0
      res.global.recovered += element.recovered || 0
      res.global.critical += element.critical || 0
    }

    return res
  }
}

interface Stats {
  country: string
  cases: number
  todayCases: number
  deaths: number
  todayDeaths: number
  recovered: number
  critical: number
}

interface CoronaData {
  global: Stats
  [country: string]: Stats
}

type RawData = [
  Stats
]
