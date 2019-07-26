
import SteamUser from 'steam-user'

import { PluginInstance, PluginOptions } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
import eventTimeout from '../../main/lib/eventTimeout'


export const options: PluginOptions = {
  type: 'controller',
  id: 'steam',
  title: 'Steam',
  description: 'Used to login to interface with steam',
  creates: [['global', 'steam']],
}


export interface SteamData {
  /** Known steamids of twitch users */
  steamIds: {[userId: number]: number}
  userIds: {[steamId: number]: number}
}


export interface SteamExtension {
  /** Pairs `userId` to `steamId` */
  setUserSteamId: Instance['setUserSteamId']
  /** Returns the bots steam username (not nickname) */
  getUsername: Instance['getUsername']
  /** Gets the cached rich presence string received of steam user known for `userId` */
  getRichPresenceString: Instance['getRichPresenceString']
}

export class Instance implements PluginInstance {
  private l: PluginLibrary
  private client: any
  private loggedOnListener: any
  private errorListener: any
  private userListener: any
  private disconnectedListener: any
  private reconnectTimeout?: NodeJS.Timeout

  private username?: string
  private password?: string

  private richPrecenseStrings: {[steamId: number]: string | undefined}

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    const defaultData: SteamData = { steamIds: {}, userIds: {} }
    this.l.load('global', 'steam', defaultData, true)

    const extension: SteamExtension = {
      setUserSteamId: this.setUserSteamId.bind(this),
      getRichPresenceString: this.getRichPresenceString.bind(this),
      getUsername: this.getUsername.bind(this),
    }
    this.l.extend(options.id, extension)

    this.richPrecenseStrings = {}
  }

  // This promise does not resolve if required config keys are not available
  // and causes other steam plugins to not load which is intended
  public async init(): Promise<void> {
    this.username = this.l.getKey('steam', 'username') || undefined
    this.password = this.l.getKey('steam', 'password') || undefined

    if (!this.username || !this.password) {
      console.error('Username and password required for steam in keys.json file')
    } else {
      this.client = new SteamUser()

      const oldEmit = this.client.emit.bind(this.client)
      this.client.emit = (...args: any[]) => {
        if (!`${args[0]}`.includes('debug')) console.log(args)
        return oldEmit(...args)
      }

      this.client.on('loggedOn', this.onLoggedOn.bind(this))
      this.client.on('error', this.onError.bind(this))
      this.client.on('user', this.onUser.bind(this))
      this.client.on('disconnected', this.onDisconnected.bind(this))

      await this.logOn()
    }
  }

  public async unload() {
    this.client.removeListener('loggedOn', this.loggedOnListener)
    this.client.removeListener('error', this.errorListener)
    this.client.removeListener('user', this.userListener)
    this.client.removeListener('disconnected', this.disconnectedListener)

    this.client.logOff()
  }

  private async logOn(timeout?: number) {
    if (!this.username || !this.password) throw new Error('No username and/or no password when trying to logon steam')
    this.client.logOn({
      accountName: this.username,
      password: this.password,
    })

    const res = await eventTimeout(this.client, 'loggedOn', timeout ? { timeout } : undefined)
    if (res.timeout) return false
    else return res.args
  }

  private reconnect() {
    console.log('reconnecting in 10 seconds')
    this.reconnectTimeout = setTimeout(() => {
      this.logOn()
      this.reconnect()
    }, 10000)
  }

  private onUser(steamId: any, user: any) {
    try {
      if (!user) return
      this.richPrecenseStrings[steamId.accountid] = (user.rich_presence_string || 'Steam') as string
    } catch (err) {
      console.error('steam:', err)
    }
  }

  private onLoggedOn(details: any) {
    console.log(`Logged into Steam as ${this.client.steamID.getSteam3RenderedID()}`)
    this.client.setPersona(SteamUser.EPersonaState.Online)
    if (this.reconnectTimeout) {
      console.log('Reconnect loop stopped')
      clearTimeout(this.reconnectTimeout)
    }
    this.reconnectTimeout = undefined
  }

  private onDisconnected(eresult: unknown, msg?: string) {
    if (this.reconnectTimeout) return // Prevent multiple reconnects
    console.error(`Steam disconnected (${msg})`)
    this.reconnect()
  }

  private onError(e: Error) {
    console.log(e)
  }


  private setUserSteamId(userId: number, steamId: number): boolean {
    const data = this.l.getData('global', 'steam') as SteamData
    if (!data) return false

    data.steamIds[userId] = steamId
    data.userIds[steamId] = userId
    return true
  }

  private getRichPresenceString(userId: number): undefined | string {
    const data = this.l.getData('global', 'steam') as SteamData
    if (!data || !data.steamIds[userId]) return undefined

    const steamId = data.steamIds[userId]
    return this.richPrecenseStrings[steamId]
  }

  private getUsername(): string {
    return this.client.username || this.username
  }
}
