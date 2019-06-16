import { ChildProcess, fork } from 'child_process'
import path from 'path'
import deepClone from './lib/deepClone'

interface ManagerOptions {
  childPath?: string
  args?: string[],
  /** Exit process if restarting too often */
  minRestartInterval?: number,
  autoRestart?: boolean,
  autoRestartNext?: boolean,
}

export class Manager {
  public opts: Required<ManagerOptions>
  private args: string[]
  private child: ChildProcess
  private lastRestart: number

  constructor(options: ManagerOptions = {}) {
    console.log('Manager started')
    this.opts = {
      childPath: path.join(__dirname, '/index'),
      args: [],
      minRestartInterval: 10 * 1000,
      autoRestart: true,
      autoRestartNext: false,
      ...deepClone(options),
    }

    this.args = []

    this.child = fork(this.opts.childPath, this.getArgs(), {cwd: process.cwd(), stdio: 'inherit'})

    this.lastRestart = 0

    this.registerEvents()
  }

// Events

  private onMessage(this: Manager, msg: {cmd: string, val: any}) {
    try {
      if (!msg.cmd) return
      const cmd = msg.cmd + ''
      const val = msg.val
      switch (cmd) {
        case 'KILL':
          process.exit()
          break
        case 'AUTO_RESTART_NEXT':
          this.opts.autoRestartNext = typeof val === undefined ? true : val
          break
        case 'AUTO_RESTART':
          this.opts.autoRestart = typeof val === undefined ? true : val
          break
        case 'SET_ARGS':
          this.args = Array.isArray(val) ? val : []
          break
        case 'PUSH_ARGS':
          if (Array.isArray(val)) this.args.push(...(val.map(v => v + '')))
          break
        default:
          console.log('Invalid message')
          console.log(msg)
          break
      }
    } catch (err) {
      console.log('Invalid message')
      console.log(msg)
    }
  }

  private onChildClose(this: Manager) {
    if (this.opts.autoRestart || this.opts.autoRestartNext) {
      this.opts.autoRestartNext = false
      this.gracedBirth()
    } else {
      console.log('Manager exiting. Autorestart disabled')
      process.exit()
    }
  }

// Methods

  private registerEvents(this: Manager) {
    this.child.on('message', this.onMessage.bind(this))
    this.child.on('close', this.onChildClose.bind(this))
  }

  private gracedBirth(this: Manager) {
    console.log('Manager birthing')
    if (this.child.once) birth.bind(this)()
    else this.child.once('close', birth.bind(this))

    function birth(this: Manager) {
      if (Date.now() - this.lastRestart < this.opts.minRestartInterval) {
        console.log('Too quick restarts')
        process.exit()
      }
      setTimeout(() => {
        this.lastRestart = Date.now()
        this.child = fork(this.opts.childPath, this.getArgs(), {cwd: process.cwd(), stdio: 'inherit'})
        this.args = []
        this.registerEvents()
      }, 1000)
    }
  }

  private getArgs(this: Manager) {
    return [...this.opts.args, ...this.args]
  }
}
