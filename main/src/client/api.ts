import fs from 'fs'
import https from 'https'
import path from 'path'
import deepClone from '../lib/deepClone'
import defaultKeys from '../lib/defaultKeys'
import * as util from '../lib/util'

interface ApiOptions {
  /** Client id which will be used to make requests */
  clientId: string,
  /** Cache data will be loaded from and saved in this directory */
  dataDir: string
  /** Cache data will be loaded from and saved with this file name */
  dataFile?: string
}

interface ApiCache {
  converted?: {[display: string]: number}
  userIds: {[login: string]: number}
  displays: {[id: number]: string}
  channels: {[channelId: number]: {
    recentBroadcasts: GenericCache
  }}
}

export default class TwitchApi {
  private opts: ApiOptions
  private cache: ApiCache
  private readonly channelDefault: {
    recentBroadcasts: GenericCache
  }
  private waitedIds: {[login: string]: Array<(value?: number | undefined) => void>}
  private waitedDisplays: {[id: number]: Array<(value?: string | undefined) => void>}

  /** Bucket size maximum */
  private rlLimit: number
  /** Remaining in bucket */
  private rlRemaining: number
  /** Bucket will reset to limit at ms */
  private rlReset: number
  /** Contains deprecation times for caches */
  private deprecate: {
    recentBroadcasts: number
  }

  constructor(options: ApiOptions) { // apiDataFile
    this.opts = {...{dataFile: 'apiCache.json'}, ...options}

    this.channelDefault = {
      recentBroadcasts: {time: 0},
    }

    this.waitedIds = {}
    this.waitedDisplays = {}

    this.rlLimit = 30
    this.rlRemaining = 30
    this.rlReset = 0

    /** Default min cache update timings */
    this.deprecate = {
      recentBroadcasts: 30 * 60 * 1000, // 30 min
    }

    fs.mkdirSync(path.dirname(this.opts.dataDir), {recursive: true})
    try {
      fs.accessSync(`${this.opts.dataDir}/${this.opts.dataFile}`, fs.constants.R_OK | fs.constants.W_OK)
    } catch (err) {
      if (err.code === 'ENOENT') fs.writeFileSync(`${this.opts.dataDir}/${this.opts.dataFile}`, '{}')
      else throw err
    }
    // Cached file has combined display and user ID pairs
    // Those will be converted to {uid: display} and {login: uid}
    const preCache =  JSON.parse(fs.readFileSync(`${this.opts.dataDir}/${this.opts.dataFile}`, 'utf8')) as ApiCache
    defaultKeys(preCache, {queueIds: [], queueDisplays: [], displays: {}, userIds: {}, channels: {}})
    if (preCache.converted) {
      for (const display in preCache.converted) {
        const uid = preCache.converted[display]
        preCache.displays[uid] = display
        preCache.userIds[display.toLowerCase()] = uid
      }
      delete preCache.converted
    }
    this.cache = preCache

    util.onExit(this.onExit.bind(this))
  }

  // !!! public cacheUser(id: number, login: string, display: string) {
  public cacheUser(id: number, display: string) {
    this.cache.userIds[display.toLowerCase()] = id
    this.cache.displays[id] = display
  }

  /** Gets the cached user ID for `login` or fetches it from the API */
  public getId(login: string): Promise<number | undefined> {
    return new Promise(async (resolve) => {
      login = login.replace('#', '').toLowerCase()
      if (this.cache.userIds[login]) return resolve(this.cache.userIds[login])
      if (this.waitedIds[login]) {
        this.waitedIds[login].push(resolve)
        return
      }
      this.waitedIds[login] = [resolve]
      // Fetch data
      const res = await this._users({login})
      let returnVal: undefined | number
      if (typeof res === 'object') { // Success! Add new values to cache and return requested value
        for (const user of res.data) {
          if (user.login === login) returnVal = ~~user.id
          this.cacheUser(~~user.id, user.display_name)
        }
      }
      // Resolve all promises for this request
      for (const resolve of this.waitedIds[login]) resolve(returnVal)
      delete this.waitedIds[login]
    })
  }

  /** Gets the cached display name for `id` or fetches it from the API */
  public getDisplay(id: number): Promise<string | undefined>  {
    return new Promise(async (resolve) => {
      if (this.cache.displays[id]) return resolve(this.cache.displays[id])
      if (this.waitedDisplays[id]) {
        this.waitedDisplays[id].push(resolve)
        return
      }
      this.waitedDisplays[id] = [resolve]
      // Fetch data
      const res = await this._users({id})
      let returnVal: undefined | string
      if (typeof res === 'object') { // Success! Add new values to cache and return requested value
        for (const user of res.data) {
          if (+user.id === id) returnVal = user.display_name
          this.cacheUser(~~user.id, user.display_name)
        }
      }
      // Resolve all promises for this request
      for (const resolve of this.waitedDisplays[id]) resolve(returnVal)
      delete this.waitedDisplays[id]
    })
  }

  /** Gets the cached display name by user `name` or fetches it from the API */
  public async toDisplay(name: string) {
    const uid = await this.getId(name)
    if (uid) return this.getDisplay(uid)
    return
  }

  /** https://dev.twitch.tv/docs/api/reference/#get-users */
  public _users(options: UsersOptions) {
    return this.get('/helix/users?', options) as Promise<UsersResponse | undefined | string>
  }

  /** https://dev.twitch.tv/docs/api/reference/#get-streams */
  public _streams(options: StreamsOptions) {
    return this.get('/helix/streams?', options) as Promise<StreamsResponse | undefined | string>
  }

  /** Gets the follow status of `user` towards `channel` from the API */
  public async getFollow(user: string | number, channel: string | number): Promise<FollowsResponse | undefined | string> {
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
  public _follows(options: FollowsOptions) {
    return this.get('/helix/follows?', options) as Promise<FollowsResponse | undefined | string>
  }

  /** Gets the most recent videos of `channel` of the type 'broadcast' */
  public async recentBroadcasts(channel: string | number, generic: GenericOptions = {})
    : Promise<string | VideosResponse | undefined> {
    if (typeof channel === 'string') channel = channel.replace('#', '')
    const channelId = (typeof channel === 'number' ? channel : await this.getId(channel))
    if (!channelId) return

    if (typeof this.cache.channels[channelId] !== 'object') this.cache.channels[channelId] = deepClone(this.channelDefault)
    else defaultKeys(this.cache.channels[channelId], this.channelDefault)

    const channelData = this.cache.channels[channelId]
    if (channelData && channelData.recentBroadcasts) {
      const cache = this.handleGeneric(channelData.recentBroadcasts, this.deprecate.recentBroadcasts, generic) as VideosResponse | undefined
      if (cache) return cache
    }
    const res = await this._videos({user_id: channelId, first: 100})
    if (typeof res === 'object') {
      if (channelData) channelData.recentBroadcasts = {time: Date.now(), res}
      return deepClone(res)
    }
    return res
  }

  /** https://dev.twitch.tv/docs/api/reference/#get-videos */
  public _videos(options: VideosOptions) {
    return this.get('/helix/videos?', options) as Promise<VideosResponse | undefined | string>
  }

  private get(path: string, params: {[param: string]: any}): Promise<object | string | undefined> {
    return new Promise((resolve) => {
      if (this.rlRemaining < 3 && this.rlReset > Date.now()) {
        console.log('API being ratelimited')
        return
      }
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
          'client-id': this.opts.clientId,
        },
      }
      https.get(options, (res) => {
        if (typeof res.headers['ratelimit-limit'] === 'string') this.rlLimit = ~~res.headers['ratelimit-limit']!
        if (typeof res.headers['ratelimit-remaining'] === 'string') this.rlRemaining = ~~res.headers['ratelimit-remaining']!
        console.log(res.headers['ratelimit-remaining'])
        if (typeof res.headers['ratelimit-reset'] === 'string') this.rlReset = ~~res.headers['ratelimit-reset']! * 1000
        if (res.statusCode === 200) { // success!
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          }).on('end', () => {
            const result = JSON.parse(data)
            resolve(result)
          }).on('error', (err) => {
            console.error(err)
            resolve(undefined)
          })
        } else resolve(`${res.statusCode}: ${util.cap((res.statusMessage || 'Unknown response').toLowerCase())}`)
      })
    })
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

  private onExit() {
    if (this.cache) {
      this.cache.converted = {}
      for (const id in this.cache.displays) {
        this.cache.converted[this.cache.displays[id]] = +id
      }
      delete this.cache.displays
      delete this.cache.userIds
      fs.writeFileSync(`${this.opts.dataDir}/${this.opts.dataFile}`, JSON.stringify(this.cache))
    } else {
      console.warn('[API] cache not saved due to it being undefined!')
    }
  }
}

interface GenericCache {
  /** Time of update */
  time: number
  /** Previous cached result */
  res?: {[x: string]: any}
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
