import { EventEmitter } from 'events'
import matchKeys, { MatchKeysOptions } from './matchKeys'

/**
 * Resolve on event or on timeout
 * @param emitter Emitter instance
 * @param event Event
 * @param options `options.timeout` Resolve if timeout executes before the event fires
 * @param options.timeout Resolve if timeout executes before the event fires
 * @param options.matchArgs Resolve only if the event returns atleast these arguments and the values match
 * @returns Object containing timeout boolean and args array arguments passed by the event
 */
export default function timeoutEvent(
  emitter: {[x: string]: any, removeListener: EventEmitter['removeListener'], on: EventEmitter['on']}, event: string, options: {
    timeout?: number,
    matchArgs?: any[],
    matchOptions?: MatchKeysOptions,
  } = {}): Promise<{timeout: boolean, args: any[] | null}> {

  return new Promise((resolve) => {
    const cbFunc = (...args: any[]) => {
      if (options.matchArgs) {
        if (!matchKeys(args, options.matchArgs, options.matchOptions || {matchValues: true})) return
      }
      emitter.removeListener(event, cbFunc)
      clearTimeout(timeout)
      resolve({timeout: false, args})
    }
    const timeoutFunc = () => {
      emitter.removeListener(event, cbFunc)
      resolve({timeout: true, args: null})
    }
    let timeout: NodeJS.Timeout
    if (options.timeout !== undefined) timeout = setTimeout(timeoutFunc, options.timeout)
    emitter.on(event, cbFunc)
  })
}
