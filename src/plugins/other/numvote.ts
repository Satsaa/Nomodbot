import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'numvote',
  title: 'Numeric Votes',
  description: 'Shows a message to the target user when they type',
  default: {
    alias: ['0', '1', '2', '3'],
    options: {
      hidden: true,
    },
  },
  help: ['Cast a vote for alias: {alias}'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  private voteData: {
    [channel: string]: {
      voters: number[]
      votes: { [vote: string]: number }
      time: number
      timeout?: NodeJS.Timeout
    }
  }

  private opts: {
    /** Minimum votes on a number for it to show up */
    minVotes: number
    /** Minimum votes for a vote to be shown */
    minTotal: number
    /** Timeouts after this ms of no votes. Affected by `decay` */
    time: number
    /** For each vote the addPerVote value is multiplied with this */
    decay: number
  }

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.voteData = {}
    this.opts = {
      minVotes: 2,
      minTotal: 10,
      time: 5000,
      decay: 0.95,
    }

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    if (!this.voteData[channelId]) this.voteData[channelId] = { voters: [], votes: {}, time: this.opts.time, timeout: undefined }

    const voting = this.voteData[channelId]

    // if (voting.voters.includes(extra.irc.tags['user-id'])) return // Single vote per user
    // voting.voters.push(extra.irc.tags['user-id'])

    if (!voting.votes[extra.words[0]]) voting.votes[extra.words[0]] = 0
    voting.votes[extra.words[0]]++

    if (voting.timeout) clearTimeout(voting.timeout)
    voting.timeout = setTimeout(() => {
      let total = 0
      const accepted: { [vote: string]: number } = {}
      for (const vote in voting.votes) {
        total += voting.votes[vote]
        if (voting.votes[vote] >= this.opts.minVotes) accepted[vote] = voting.votes[vote]
      }
      if (total < this.opts.minTotal || Object.keys(accepted).length < 2) {
        this.voteData[channelId] = { voters: [], votes: {}, time: this.opts.time, timeout: undefined }
        return
      }

      const results = []
      for (const vote in accepted) {
        results.push(`${vote}: ${Math.round(accepted[vote] / total * 100)}%`)
      }
      // Votes displayed like: '| 1: 25% | 2: 45% |'
      this.l.chat(channelId, `| ${results.join(' | ')} |`)
      this.voteData[channelId] = { voters: [], votes: {}, time: this.opts.time, timeout: undefined }
    }, voting.time)
    console.log(voting.time)
    voting.time *= this.opts.decay
  }
}
