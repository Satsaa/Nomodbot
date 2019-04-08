import https from 'https'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import deepClone from '../../src/lib/deepClone'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'controller',
  id: 'twitchapi',
  name: 'TwitchApi',
  description: 'Cache, ratelimit, update and request API data',
  creates: [['global', 'twitchApi'], ['twitchApi'],
  ],
}

/**
 * API for some often used 
 */
export interface TwitchApiExtension {
  /** Gets the cached user ID for `display` or fetches it from the API */
  readonly getId: Instance['getId']
  /** Gets the cached display name for `id` or fetches it from the API */
  readonly getDisplay: Instance['getDisplay']
  /** https://dev.twitch.tv/docs/api/reference/#get-users */
  readonly _users: Instance['_users']
  /** https://dev.twitch.tv/docs/api/reference/#get-streams */
  readonly _streams: Instance['_streams']
  /** Gets the follow status of `user` towards `channel` from the API */
  readonly getFollow: Instance['getFollow']
  /** https://dev.twitch.tv/docs/api/reference/#get-users-follows */
  readonly _follows: Instance['_follows']
  /** Gets the most recent videos of `channel` of the type 'broadcast' */
  readonly recentBroadcasts: Instance['recentBroadcasts']
  /** https://dev.twitch.tv/docs/api/reference/#get-videos */
  readonly _videos: Instance['_videos']
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private clientId?: string
  private cache: {
    queueIds: number[]
    queueDisplays: string[]
    userIds: {[display: string]: number}
  }
  private displays: {[id: number]: string}

  /** Bucket will be reset to this */
  private rlLimit: number
  /** Remaining in bucket */
  private rlRemaining: number
  /** Bucket will reset at ms */
  private rlReset: number
  /** Contains deprecation times for caches */
  private deprecate: {
    recentBroadcasts: number
  }

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.l.autoLoad('twitchApi', { recentBroadcasts: {time: 0, res: undefined} }, true)

    this.cache = {queueIds: [], queueDisplays: [], userIds: {}}
    this.displays = {}

    this.rlLimit = 30
    this.rlRemaining = 30
    this.rlReset = 0

    this.deprecate = {
      recentBroadcasts: 30 * 60 * 1000, // 30 min
    }
  }

  public async init(): Promise<void> {
    this.clientId = this.l.getKey('twitch', 'client-id')
    this.cache = await this.l.load('global', 'twitchApi', this.cache, true) as Instance['cache']
    if (!this.cache) throw new Error('Failure to load cache')
    for (const display in this.cache.userIds) { // Build display cache from id cache
      this.displays[this.cache.userIds[display]] = display
    }
    const extensions: TwitchApiExtension = {
      getId: this.getId.bind(this),
      getDisplay: this.getDisplay.bind(this),
      _users: this._users.bind(this),
      _streams: this._streams.bind(this),
      getFollow: this.getFollow.bind(this),
      _follows: this._follows.bind(this),
      recentBroadcasts: this.recentBroadcasts.bind(this),
      _videos: this._videos.bind(this),
    }
    this.l.extend(options.id, extensions)
    this.l.emitter.on('chat', this.onChat.bind(this))
  }

  private onChat(channel: string, user: string, userstate: IrcMessage['tags'], message: string, me: boolean, self: boolean) {
    if (!userstate['user-id'] || !userstate['display-name']) return
    this.cache.userIds[user] = userstate['user-id']
    this.displays[userstate['user-id']] = userstate['display-name']
  }

  private get(path: string, params: {[param: string]: any}): Promise<object | string | undefined> {
    return new Promise((resolve) => {
      if (this.rlRemaining < 3 && this.rlReset > Date.now()) return // Avoid ratelimits
      if (!path.endsWith('?')) path = path + '?'
      if (!path.startsWith('/')) path = '/' + path

      // Stringify query parameters
      let queryP: string = ''
      for (const param in params) {
        const paramVal = params[param]
        if (Array.isArray(paramVal)) paramVal.forEach(v => queryP += `${param}=${encodeURIComponent(v)}&`)
        else queryP += `${param}=${encodeURIComponent(paramVal)}&`
      }

      console.log(path + queryP)

      const options = {
        host: 'api.twitch.tv',
        path: path + queryP,
        headers: {
          'client-id': this.clientId,
        },
      }
      https.get(options, (res) => {
        if (typeof res.headers['ratelimit-limit'] === 'string') this.rlLimit = ~~res.headers['ratelimit-limit']!
        if (typeof res.headers['ratelimit-remaining'] === 'string') this.rlRemaining = ~~res.headers['ratelimit-remaining']!
        if (typeof res.headers['ratelimit-reset'] === 'string') this.rlReset = ~~res.headers['ratelimit-reset']! * 1000
        if (res.statusCode === 200) { // success!
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          }).on('end', () => {
            const result = JSON.parse(data)
            resolve(result)
          }).on('error', (err) => {
            console.log(err)
            resolve(undefined)
          })
        } else resolve(`${res.statusCode}: ${this.l.u.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
      })
    })
  }

  /** 'xXx_yoyo_xXx' -> 283291183 */
  private async getId(display: string): Promise<number | void> {
    display = display.replace('#', '').toLowerCase()
    if (this.cache.userIds[display]) return this.cache.userIds[display]
    // Get previosuly requested but failed ids and displayNames
    const displays = this.cache.queueDisplays.splice(0, 98)
    displays.push(display) // Add the requested element
    const ids = this.cache.queueIds.splice(0, 99)
    // Fetch data
    const res = await this._users({id: ids, login: displays})
    if (typeof res === 'object') { // Success! Add new values to cache and return requested value
      const dlc = display.toLowerCase()
      let returnVal
      for (const user of res.data) {
        if (user.login === dlc) returnVal = ~~user.id
        this.cache.userIds[user.display_name] = ~~user.id // Cache
        this.displays[~~user.id] = user.display_name // Cache
      }
      return returnVal
    } else { // Failed... push back to queue
      this.cache.queueDisplays.push(...displays)
      this.cache.queueIds.push(...ids)
      return
    }
  }
  /** 98993843 -> 'LoliboyWasTaken' */
  private async getDisplay(id: number): Promise<string | void>  {
    if (this.displays[id]) return this.displays[id]
    // Get previosuly requested but failed ids and displayNames
    const displays = this.cache.queueDisplays.splice(0, 99)
    const ids = this.cache.queueIds.splice(0, 98)
    ids.push(id) // Add the requested element
    // Fetch data
    const res = await this._users({id: ids, login: displays})
    if (typeof res === 'object') { // Success! Add new values to cache and return requested value
      const idStr = id.toString()
      let returnVal
      for (const user of res.data) {
        if (user.id === idStr) returnVal = user.display_name
        this.cache.userIds[user.display_name] = ~~user.id // Cache
        this.displays[~~user.id] = user.display_name // Cache
      }
      return returnVal
    } else { // Failed... push back to queue
      this.cache.queueDisplays.push(...displays)
      this.cache.queueIds.push(...ids)
      return
    }
  }
  private _users(options: UsersOptions) {
    return this.get('/helix/users?', options) as Promise<UsersResponse | undefined | string>
  }

  private _streams(options: StreamsOptions) {
    return this.get('/helix/streams?', options) as Promise<StreamsResponse | undefined | string>
  }

  private async getFollow(user: string | number, channel: string | number): Promise<FollowsResponse | undefined | string> {
    if (typeof user === 'string' || typeof channel === 'string') {
      const usersOpts: UsersOptions = {login: []}
      if (typeof user === 'string') (usersOpts.login as string[]).push(user)
      if (typeof channel === 'string') {
        channel = channel.replace('#', '');
        (usersOpts.login as string[]).push(channel)
      }
      const res = await this._users(usersOpts)
      if (typeof res !== 'object') return res
      for (const resUser of res.data) {
        if (typeof user === 'string' && resUser.login === user.toLowerCase()) user = resUser.id
        if (typeof channel === 'string' && resUser.login === channel.toLowerCase()) channel = resUser.id
      }
    }
    if (typeof user === 'string' || typeof channel === 'string') {
      console.warn('user or channel was a string. Both should have been converted to numbers (ids) and that conversion failed')
      return
    }
    return this._follows({from_id: user, to_id: channel})
  }
  private _follows(options: FollowsOptions) {
    return this.get('/helix/follows?', options) as Promise<FollowsResponse | undefined | string>
  }

  private async recentBroadcasts(channel: string | number, generic: GenericOptions = {})
    : Promise<string | VideosResponse | undefined> {
    if (typeof channel === 'string') channel = channel.replace('#', '')
    const userId = (typeof channel === 'number' ? channel : await this.getId(channel))
    if (!userId) return

    const data = this.l.getData(`#${channel}`, 'twitchApi') as undefined | {recentBroadcasts: GenericCache}
    if (data && data.recentBroadcasts) {
      const cache = this.handleGeneric(data.recentBroadcasts, this.deprecate.recentBroadcasts, generic) as VideosResponse | undefined
      if (cache) return cache
    }
    const res = await this._videos({user_id: userId, first: 100})
    if (typeof res === 'object') {
      const data = this.l.getData(`#${channel}`, 'twitchApi')
      if (data) data.recentBroadcasts = {time: Date.now(), res}
      return deepClone(res)
    }
    return res
  }

  private _videos(options: VideosOptions) {
    return this.get('/helix/videos?', options) as Promise<VideosResponse | undefined | string>
  }

  /** Returns the cached data or undefined if an update is necessary */
  private handleGeneric(cache: GenericCache, deprecate: number, generic: GenericOptions): object | void {
    if (!cache) return
    if (generic.noUpdate) return cache.res
    if (generic.requireUpdate) return // Must update
    const now = Date.now()
    if (generic.maxAge) if (cache.time + generic.maxAge > now) return // Too old
    if (generic.preferUpdate) if (this.rlRemaining < 3 && this.rlReset > now) return // Prefer update -> Check if possible
    if (cache.time + deprecate < now && (this.rlRemaining >= 3 || this.rlReset < now)) return // Timed update
    console.log('cached')
    return cache.res
  }
}

interface GenericCache {
  /** Time of update */
  time: number
  /** Previous cached result */
  res: any
}

interface GenericOptions {
  /** An update will be done if possible, otherwise returns the previous cached result */
  preferUpdate?: boolean
  /** An update will be done if possible, otherwise returns undefined  */
  requireUpdate?: boolean
  /** An update will be done if possible if the cache is older than this (ms) */
  maxAge?: number
  /** Cached result will be returned although it may be undefined */
  noUpdate?: boolean
}

interface UsersOptions {
  // User ID. Multiple user IDs can be specified. Limit: 100
  id?: number | number[]
  // User login name. Multiple login names can be specified. Limit: 100
  login?: string | string[]
}
interface UsersResponse {
  data: Array<{
    // User’s broadcaster type: "partner", "affiliate", or ""
    broadcaster_type: string
    // User’s channel description
    description: string
    // User’s display name
    display_name: string
    // User’s email address. Returned if the request includes the user:read:email scope
    email?: string
    // User’s ID
    id: string
    // User’s login name
    login: string
    // URL of the user’s offline image
    offline_image_url: string
    // URL of the user’s profile image
    profile_image_url: string
    // User’s type: "staff", "admin", "global_mod", or ""
    type: string
    // Total number of views of the user’s channel
    view_count: number
  }>
}

interface StreamsOptions {
  /** Returns streams broadcast by one or more specified user IDs. You can specify up to 100 IDs */
  user_id?: number | number[]
  /** Returns streams broadcast by one or more specified user login names. You can specify up to 100 names */
  user_login?: string | string[]
  /** Returns streams broadcasting a specified game ID. You can specify up to 100 IDs */
  game_id?: number | number[]
  /** Returns streams in a specified community ID. You can specify up to 100 IDs */
  community_id?: number | number[]
  /** Maximum number of objects to return. Maximum: 100. Default: 20 */
  first?: number
  /** Stream language. You can specify up to 100 languages */
  language?: string | string[]
  /** Cursor for forward pagination */
  after?: string
  /** Cursor for backward pagination */
  before?: string
}
interface StreamsResponse {
  data: Array<{
    /** Array of community IDs */
    community_ids: string[]
    /** ID of the game being played on the stream */
    game_id: string
    /** Stream ID */
    id: string
    /** Stream language */
    language: string
    /** A cursor value, to be used in a subsequent request to specify the starting point of the next set of results */
    pagination: string
    /** UTC timestamp */
    started_at: string
    /** Shows tag IDs that apply to the stream */
    tag_ids: string
    /** Thumbnail URL of the stream. You can replace {width} and {height} with any values to get that size image */
    thumbnail_url: string
    /** Stream title */
    title: string
    /** Stream type: "live" or "" (in case of error) */
    type: string
    /** ID of the user who is streaming */
    user_id: string
    /** Login name corresponding to user_id */
    user_name: string
    /** Number of viewers watching the stream at the time of the query */
    viewer_count: number
  }>
  pagination: { cursor?: string }
}

interface FollowsOptions {
  /** Cursor for forward pagination */
  after?: string
  /** Maximum number of objects to return. Maximum: 100. Default: 20 */
  first?: number
  /** User ID. The request returns information about users who are being followed by the from_id user */
  from_id?: number
  /** User ID. The request returns information about users who are following the to_id user */
  to_id?: number
}
interface FollowsResponse {
  /**
   * Total number of items returned  
   * If only from_id was in the request, this is the total number of followed users  
   * If only to_id was in the request, this is the total number of followers  
   * If both from_id and to_id were in the request, this is 1 (if the "from" user follows the "to" user) or 0  
   */
  total: number
  data: Array<{
    /** Date and time when the from_id user followed the to_id user */
    followed_at: string
    /** ID of the user following the to_id user */
    from_id: string
    /** Login name corresponding to from_id */
    from_name: string
    /** A cursor value, to be used in a subsequent request to specify the starting point of the next set of results */
    pagination: string
    /** ID of the user being followed by the from_id user */
    to_id: string
    /** Login name corresponding to to_id */
    to_name: string
  }>
  pagination: { cursor?: string }
}

type VideosOptions = ({
  /** ID of the video being queried. Limit: 100. If this is specified, you cannot use any of the optional query string parameters below */
  id: number | number[]
  user_id?: undefined
  game_id?: undefined
}) | ({
  id?: undefined
  /** ID of the user who owns the video. Limit 1 */
  user_id: number
  game_id?: undefined
} | {
  id?: undefined
  user_id?: undefined
  /** ID of the game the video is of. Limit 1 */
  game_id: number
}) & {
  /** Cursor for forward pagination */
  after?: string
  /** Cursor for backward pagination */
  before?: string
  /** Number of values to be returned when getting videos by user or game ID. Limit: 100. Default: 20 */
  first?: number
  /** Language of the video being queried. Limit: 1 */
  language?: string
  /** Period during which the video was created. Valid values: "all", "day", "week", "month". Default: "all" */
  period?: 'all' | 'day' | 'week' | 'month'
  /** Sort order of the videos. Valid values: "time", "trending", "views". Default: "time" */
  sort?: 'time' | 'trending' | 'views'
  /** Type of video. Valid values: "all", "upload", "archive", "highlight". Default: "all" */
  type?: 'all' | 'upload' | 'archive' | 'highlight'
}

interface VideosResponse {
  data: Array<{
    /** Date when the video was created */
    created_at: string
    /** Description of the video */
    description: string
    /** Length of the video */
    duration: string
    /** ID of the video */
    id: string
    /** Language of the video */
    language: string
    /** A cursor value, to be used in a subsequent request to specify the starting point of the next set of results */
    pagination: string
    /** Date when the video was published */
    published_at: string
    /** Template URL for the thumbnail of the video */
    thumbnail_url: string
    /** Title of the video */
    title: string
    /** Type of video. Valid values: "upload", "archive", "highlight" */
    type: 'upload' | 'archive' | 'highlight'
    /** URL of the video */
    url: string
    /** ID of the user who owns the video */
    user_id: string
    /** Login name corresponding to user_id */
    user_name: string
    /** Number of times the video has been viewed */
    view_count: number
    /** Indicates whether the video is publicly viewable. Valid values: "public", "private" */
    viewable: 'public' | 'private'
  }>
  pagination: { cursor?: string }
}
