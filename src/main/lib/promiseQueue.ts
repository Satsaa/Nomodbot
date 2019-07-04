import { promises as fsp } from 'fs'

import { asyncTimeout } from './util'

interface Entry {
  func: (...a: any[]) => Promise<any>
  args: any[]
  resolve: (value?: any | PromiseLike<any> | undefined) => void
  reject: (reason?: any) => void
}

/**
 * Enables executing promises in order, starting the next promise when the previous one finishes  
 */
export default class PromiseQueue {
  private stack: Entry[]

  constructor() {
    this.stack = []
  }

  /** Length of the queue. Promises are removed from the queue after they finish */
  public get length() {
    return this.stack.length
  }

  /**
   * Puts the provided function last in the queue  
   * The function is then executed when it's first in the queue  
   * Returned promise value is preserved  
   * @param func Executed function that returns a promise
   * @param args Arguments for `func`
   */
  public async queue<A extends any[], T>(func: (...args: A) => Promise<T>, ...args: A): Promise<T> {
    return new Promise((resolve, reject) => {
      this.stack.push({ func: func as Entry['func'], args, resolve, reject })
      if (this.stack.length === 1) this.loop()
    })
  }

  /**
   * Puts the provided function first in the queue  
   * The function is executed immediately if there is no pending promise  
   * Returned promise value is preserved  
   * @param func Executed function that returns a promise
   * @param args Arguments for `func`
   */
  public async queueNext<A extends any[], T>(func: (...args: A) => Promise<T>, ...args: A): Promise<T> {
    return new Promise((resolve, reject) => {
      this.stack.push({ func: func as Entry['func'], args, resolve, reject })
      if (this.stack.length === 1) this.loop()
    })
  }

  private async loop() {
    // console.log('Loop start')
    while (this.stack.length) {
      const entry = this.stack[0]

      try {
        const res = await entry.func(...entry.args)
        this.stack.shift()
        entry.resolve(res)
      } catch (err) {
        this.stack.shift()
        entry.reject(err)
      }
    }
    // console.log('Loop end')
  }
}
