import fs from 'fs'
import { promises as fsp } from 'fs'
import https from 'https'
import path from 'path'
import deepClone from '../lib/deepClone'
import defaultKeys from '../lib/defaultKeys'
import * as util from '../lib/util'

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

interface ApiOptions {
  /** Client id which will be used to make requests */
  clientId: string,
  /** Bot data root folder path */
  dataRoot: string
}

export default class TwitchApi {
  private opts: ApiOptions
  private channelCaches: {
    [channelId: number]: {
      recentBroadcasts: GenericCache
    }
  }
  private ids: {[login: string]: number}
  private logins: {[uid: number]: string}
  private displays: {[uid: number]: string}
  /** Default blueprint for channels' cache entries */
  private readonly channelCacheDefault: {
    recentBroadcasts: GenericCache
  }

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
    this.opts = options

    this.channelCaches = {}

    this.channelCacheDefault = {
      recentBroadcasts: {time: 0},
    }

    this.rlLimit = 30
    this.rlRemaining = 30
    this.rlReset = 0

    /** Default min cache update timings */
    this.deprecate = {
      recentBroadcasts: 30 * 60 * 1000, // 30 min
    }

    // Prepare cache file
    fs.mkdirSync(path.dirname(this.opts.dataRoot), {recursive: true})
    try {
      fs.accessSync(`${this.opts.dataRoot}/global/apiCache.json`, fs.constants.R_OK | fs.constants.W_OK)
    } catch (err) {
      if (err.code === 'ENOENT') fs.writeFileSync(`${this.opts.dataRoot}/global/apiCache.json`, '{}')
      else throw err
    }

    // Cached file has uid, login, display tuples
    // Those will be converted to {uid: display} and {login: uid} and vice versa
    this.ids = {}
    this.logins = {}
    this.displays = {}
    const userFile =  JSON.parse(fs.readFileSync(`${this.opts.dataRoot}/global/apiCache.json`, 'utf8')) as Array<[number, string, string]>
    for (const user of userFile) {
      const [id, login, display] = user
      this.cacheUser(id, login, display)
    }

    util.onExit(this.onExit.bind(this))
  }

  // Caches a id, login, display tuple for later use
  public cacheUser(id: number, login: string, display: string) {
    this.ids[login] = id
    this.logins[id] = login
    this.displays[id] = display
  }

  /** Gets the cached user ID for `login` or fetches it from the API */
  public async getId(login: string, onlyCached = false): Promise<number | undefined> {
    if (this.ids[login]) return this.ids[login]
    else {
      if (onlyCached) return

      const res = await this._users({login})
      if (typeof res === 'object' && res.data[0]) {
        this.cacheUser(~~res.data[0].id, res.data[0].login, res.data[0].display_name)
        return this.ids[login] // now defined by cacheUser
      } else return
    }
  }

  /** Gets the cached login name for `id` or fetches it from the API */
  public async getLogin(id: number, onlyCached = false): Promise<string | undefined> {
    if (this.logins[id]) return this.logins[id]
    else {
      if (onlyCached) return

      const res = await this._users({id})
      if (typeof res === 'object' && res.data[0]) {
        this.cacheUser(~~res.data[0].id, res.data[0].login, res.data[0].display_name)
        return this.logins[id] // now defined by cacheUser
      } else return
    }
  }

  /** Gets the cached display name for `id` or fetches it from the API */
  public async getDisplay(id: number, onlyCached = false): Promise<string | undefined>  {
    if (this.displays[id]) return this.displays[id]
    else {
      if (onlyCached) return

      const res = await this._users({id})
      if (typeof res === 'object' && res.data[0]) {
        this.cacheUser(~~res.data[0].id, res.data[0].login, res.data[0].display_name)
        return this.displays[id] // now defined by cacheUser
      } else return
    }
  }

  /** Typed function for https://dev.twitch.tv/docs/api/reference/#get-users */
  public _users(options: UsersOptions) {
    return this.get('/helix/users?', options) as Promise<UsersResponse | undefined | string>
  }

  /** Typed function for https://dev.twitch.tv/docs/api/reference/#get-streams */
  public _streams(options: StreamsOptions) {
    return this.get('/helix/streams?', options) as Promise<StreamsResponse | undefined | string>
  }

  /** Gets the follow status of `userId` towards `channelId` from the API */
  public async getFollow(userId: number, channelId: number): Promise<FollowsResponse['data'][number] | undefined | string> {
    const res = await this._follows({from_id: userId, to_id: channelId})
    if (typeof res === 'object') {
      return res.data[0]
    }
    return res
  }
  public _follows(options: FollowsOptions) {
    return this.get('/helix/follows?', options) as Promise<FollowsResponse | undefined | string>
  }

  /** Gets the most recent videos of `channelId` of the type 'broadcast' */
  public async recentBroadcasts(channelId: number, generic: GenericOptions = {}): Promise<string | VideosResponse | undefined> {

    if (!this.channelCaches[channelId]) this.loadChannelCache(channelId)
    const channelCache = this.channelCaches[channelId].recentBroadcasts

    const cached = this.handleGeneric(channelCache, this.deprecate.recentBroadcasts, generic) as VideosResponse | undefined
    if (cached) return cached

    const res = await this._videos({user_id: channelId, first: 100})
    if (typeof res === 'object') {
      channelCache.res = res
      channelCache.time = Date.now()
      return deepClone(res)
    }
    return res
  }

  /** Typed function for https://dev.twitch.tv/docs/api/reference/#get-videos */
  public _videos(options: VideosOptions) {
    return this.get('/helix/videos?', options) as Promise<VideosResponse | undefined | string>
  }

  /** Reads the channel cache of `channelId` to memory */
  public async loadChannelCache(channelId: number): Promise<boolean> {
    if (this.channelCaches[channelId]) return false // Block unneeded loads
    this.channelCaches[channelId] = deepClone(this.channelCacheDefault) // Blocks multiple loads
    const path = `${this.opts.dataRoot}/${channelId}/apiCache.json`
    const dir = `${this.opts.dataRoot}/${channelId}/`
    try {
      await fsp.mkdir(dir, { recursive: true })
      const cache = JSON.parse(await fsp.readFile(path, 'utf8'))
      this.channelCaches[channelId] = cache
      defaultKeys(cache, this.channelCacheDefault) // Make sure source file has all required keys
    } catch (err) {
      if (err.code === 'ENOENT') {
        defaultKeys(this.channelCaches[channelId], this.channelCacheDefault)
      } else throw err
    }
    return true
  }
  /** Saves and removes channel cache of `channelId` from memory */
  public async unloadChannelCache(channelId: number): Promise<boolean> {
    if (!this.channelCaches[channelId]) return false // Block unneeded unloads
    const path = `${this.opts.dataRoot}/${channelId}/apiCache.json`
    const dir = `${this.opts.dataRoot}/${channelId}/`
    await fsp.mkdir(dir, { recursive: true })
    await fsp.writeFile(path, JSON.stringify(this.channelCaches[channelId], null, '\t'))
    delete this.channelCaches[channelId]
    return true
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

  /**
   * Returns `cache.res` or undefined if an update is expected
   * @param cache `GenericCache` object
   * @param deprecate Maximum age of `cache` before updating
   * @param generic `GenericOptions` object
   */
  private handleGeneric(cache: GenericCache, deprecate: number, generic: GenericOptions): object | void {
    if (!cache) return
    if (!cache.res) return
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
    // Save user conversion data
    // convert to tuples
    const saveData: Array<[number, string, string]> = []
    let failed = 0
    for (const _id in this.logins) {
      const id = ~~_id
      const login = this.logins[id]
      const display = this.displays[id]
      if (id && login && display) {
        saveData.push([id, login, display])
      } else {
        failed++
      }
    }
    if (failed) console.log(`[TWITCHAPI] Skipped ${failed} ${util.plural(failed, 'users')} on apiUsers.json save`)
    // Folders must be created at this points
    fs.writeFileSync(`${this.opts.dataRoot}/global/apiUsers.json`, JSON.stringify(saveData, null, '\t'))

    // Save loaded channel caches
    for (const channelId in this.channelCaches) {
      const path = `${this.opts.dataRoot}/${channelId}/apiCache.json`
      const dir = `${this.opts.dataRoot}/${channelId}/`
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path, JSON.stringify(this.channelCaches[channelId], null, '\t'))
    }
  }
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
