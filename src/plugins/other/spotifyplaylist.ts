import https from 'https'

import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'spotifyplaylist',
  title: 'SpotifyPlaylist',
  description: 'Shows the first or nth song on a spotify playlist. An automatically updating playlist can be used for live song names',
  default: {
    alias: ['!song', '?song'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  creates: [['spotifyPlaylist']],
  help: [
    'Show the first or nth song on the playlist: {alias} [<1-Infinity>]',
    'Show a link to the playlist: {alias} <list/list/i>',
    'Set the playlist: {alias} set <playlist_ID|playlist_link>',
    'Delete the playlist: {alias} delete',
  ],
  disableMention: true,
}

interface SpotifyPlaylistData {
  playlist: string
  creator: string
  name: string
}

export class Instance implements PluginInstance {
  private l: PluginLibrary
  private clientId?: string
  private clientSecret?: string
  private accessToken?: string
  private timeout?: NodeJS.Timeout

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.clientId = this.l.getKey('spotify', 'client_id')
    this.clientSecret = this.l.getKey('spotify', 'client_secret')
    this.accessToken = undefined
    if (typeof this.clientId !== 'string' || typeof this.clientSecret !== 'string') {
      console.log('[SPOTIFYPLAYLIST] Disabled due to the lack of API keys for spotify')
    } else {
      this.tokenLoop()
      this.l.autoLoad('spotifyPlaylist', {})
    }
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (typeof this.clientId !== 'string' || typeof this.clientSecret !== 'string') return this.l.insertAtUser('This command disabled due to lack of API keys', extra)
    if (!this.accessToken) return this.l.insertAtUser('Cannot handle requests at this time', extra)

    const data = this.l.getData(channelId, 'spotifyPlaylist') as SpotifyPlaylistData
    if (!data) return this.l.insertAtUser('Unavailable: required data is not present', extra)
    try {
      if (params[1] && params[1].toLowerCase() === 'delete') {
        // Delete the playlist data
        if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, tags.badges)) return this.l.insertAtUser('You are not permitted to do this operation', extra)

        const data = this.l.getData(channelId, 'spotifyPlaylist') as SpotifyPlaylistData
        if (!data) return this.l.insertAtUser('Unavailable: required data is not present', extra)
        this.l.setData(channelId, 'spotifyPlaylist', {})
        return this.l.insertAtUser('Deleted succesfully', extra)
      } else if (params[1] && params[1].toLowerCase() === 'set') {
        // Set track id
        if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, tags.badges)) return this.l.insertAtUser('You are not permitted to do this operation', extra)

        const inputId = (params[2].replace(/\/+$/, '').match(/[a-zA-Z0-9]*$/) || [])[0]
        if (!inputId) return this.l.insertAtUser('Invalid input', extra)

        const playlist = await this.getPlaylist(inputId)
        if (typeof playlist !== 'object') return this.l.insertAtUser('Invalid playlist', extra)
        if (playlist.type !== 'playlist') return this.l.insertAtUser('Only playlists are supported', extra)

        const data = this.l.getData(channelId, 'spotifyPlaylist') as SpotifyPlaylistData
        if (!data) return this.l.insertAtUser('Unavailable: required data is not present', extra)
        data.playlist = playlist.id
        data.creator = playlist.owner.display_name
        data.name = playlist.name
        return this.l.insertAtUser(`Playlist set to ${playlist.name} by ${playlist.owner.display_name}`, extra)
      } else if (params[1] && params[1].toLowerCase().includes('list') && isNaN(Number(params[1]))) {
        // Show playlist link when only 1 string parameter given
        if (!data.playlist) return this.l.insertAtUser(`Playlist is not set. Find your playlist's id or it's link (like 4i8R1IsL69r7a7SHjGZ95d OR open.spotify.com/playlist/4i8R1IsL69r7a7SHjGZ95d) then use ${params[0]} set <id or link>`, extra)
        return this.l.insertAtUser(`${data.name && data.creator ? `${data.name} by ${data.creator}` : 'Paylist'}: open.spotify.com/playlist/${data.playlist}`, extra)
      } else {
        // Show recent track
        if (!data.playlist) return this.l.insertAtUser(`Playlist is not set. Find your playlist's id or it's link (like 4i8R1IsL69r7a7SHjGZ95d OR open.spotify.com/playlist/4i8R1IsL69r7a7SHjGZ95d) then use ${params[0]} set <id or link>`, extra)

        const pos = params[1] ? Math.floor(~~params[1] - 1) : 0
        const playlist = await this.getPlaylist(data.playlist)
        if (typeof playlist === 'string') return this.l.insertAtUser('Invalid playlist', extra)

        const track = playlist.tracks.items[pos].track
        if (!track) return this.l.insertAtUser('No track found at that position', extra)

        const noFeat = track.name.replace(/ ?(\(with|\(feat).*\)/, '') // Remove feat stuff from track name
        return `"${noFeat}" by ${this.l.u.commaPunctuate(track.artists.map((i: any) => i.name))}`
      }
    } catch (err) {
      console.error(err)
      return this.l.insertAtUser('Catastrophic error', extra)
    }
  }

  public async unload() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout.unref()
    }
  }

  private getPlaylist(playlist: string): Promise<{[x: string]: any} | string> {
    return new Promise((resolve) => {
      const options = {
        host: 'api.spotify.com',
        path: `/v1/playlists/${playlist}/`,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
          }).on('error', (err) => { resolve(err.name) })
        } else {
          resolve(`${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
        }
      })
    })
  }

  private tokenLoop() {
    if (!this.clientId || !this.clientSecret) throw new Error('client_id and client_secret undefined')
    this.accessToken = undefined

    const options: https.RequestOptions = {
      host: 'accounts.spotify.com',
      path: '/api/token/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
    }

    const request = https.request(options, (res) => {
      if (res.statusCode === 200) { // success!
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        }).on('end', () => {
          const result = JSON.parse(data)
          console.log('[SPOTIFYPLAYLIST] Refreshed access token')
          this.accessToken = result.access_token
          this.timeout = setTimeout(this.tokenLoop.bind(this), result.expires_in * 1000 - 5000)
        }).on('error', (err) => {
          console.log('[SPOTIFYPLAYLIST] Error when requesting access token', res)
          this.timeout = setTimeout(this.tokenLoop.bind(this), 10 * 1000)
        })
      } else {
        console.log('[SPOTIFYPLAYLIST] Unexpected response when requesting access token', res)
        this.timeout = setTimeout(this.tokenLoop.bind(this), 60 * 1000)
      }
    })

    request.on('error', (err) => {
      console.log('[SPOTIFYPLAYLIST] Error when requesting access token')
      console.error(err)
      this.timeout = setTimeout(this.tokenLoop.bind(this), 10 * 1000)
    })

    request.write('grant_type=client_credentials')
    request.end()
  }
}
