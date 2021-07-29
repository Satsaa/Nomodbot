import { ChildProcess, fork } from 'child_process'
import path from 'path'

import deepClone from './lib/deepClone'
import { removeOption } from './lib/args'
import { rules } from './argRules'

export interface ManagerOptions {
  childPath?: string
  args?: string[]
  /** Exit process if restarting too often */
  minRestartInterval?: number
  noAutoRestart?: boolean
  autoRestartNext?: boolean
  /** Add --inspect flag to child processes */
  inspect?: boolean
}

export class Manager {
  public opts: Required<ManagerOptions>
  private extraArgs: string[]
  private child: ChildProcess
  private lastRestart: number

  constructor(options: ManagerOptions = {}) {
    console.log('Manager started')
    this.opts = {
      childPath: path.join(__dirname, '/index'),
      args: process.argv,
      minRestartInterval: 10 * 1000,
      noAutoRestart: false,
      autoRestartNext: false,
      inspect: false,
      ...deepClone(options),
    }

    this.extraArgs = []

    this.opts.args.splice(0, 2) // Remove target path
    this.opts.args = removeOption('inspect-child', this.opts.args, rules)
    this.opts.args = removeOption('manager', this.opts.args, rules)
    this.child = fork(this.opts.childPath, this.getArgs(), { cwd: process.cwd(), stdio: 'inherit', execArgv: this.getExecArgs() })
    this.opts.args = removeOption('join-message', this.opts.args, rules)
    console.log('Child birth')

    this.lastRestart = 0

    this.registerEvents()
  }

  // Events

  private onMessage(this: Manager, msg: {cmd: string, val: any}) {
    try {
      if (!msg.cmd) return

      const cmd = `${msg.cmd}`
      const val = msg.val
      switch (cmd) {
        case 'KILL':
          process.exit()
          break
        case 'AUTO_RESTART_NEXT':
          this.opts.autoRestartNext = typeof val === undefined ? true : val
          break
        case 'AUTO_RESTART':
          this.opts.noAutoRestart = typeof val === undefined ? false : !val
          break
        case 'REMOVE_ARG':
          this.extraArgs = removeOption(val, this.extraArgs, rules)
          break
        case 'PUSH_ARGS':
          if (Array.isArray(val)) this.extraArgs.push(...val.map(v => `${v}`))
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
    console.log('Child death')
    if (!this.opts.noAutoRestart || this.opts.autoRestartNext) {
      this.opts.autoRestartNext = false
      this.gracedBirth()
    } else {
      console.log('Manager exiting. Autorestart disabled')
      // Delay closing so the bot can finish writing data and thus shouldn't corrupt files
      setTimeout(() => {
        process.exit()
      }, 5000)
    }
  }

  // Methods

  private registerEvents(this: Manager) {
    this.child.on('message', this.onMessage.bind(this))
    this.child.on('close', this.onChildClose.bind(this))
  }

  private gracedBirth(this: Manager) {
    console.log('Manager birthing')
    if (this.child.once as any) birth.bind(this)()
    else this.child.once('close', birth.bind(this))

    function birth(this: Manager) {
      if (Date.now() - this.lastRestart < this.opts.minRestartInterval) {
        console.log('Too quick restarts')
        // Delay closing so the bot can finish writing data and thus shouldn't corrupt files
        setTimeout(() => {
          process.exit()
        }, 5000)
        return
      }
      setTimeout(() => {
        this.lastRestart = Date.now()
        this.child = fork(this.opts.childPath, this.getArgs(), { cwd: process.cwd(), stdio: 'inherit', execArgv: this.getExecArgs() })
        console.log('Child birth')
        this.extraArgs = []
        this.registerEvents()
      }, 1000)
    }
  }

  private getArgs(this: Manager) {
    console.log([...this.opts.args, ...this.extraArgs])
    return [...this.opts.args, ...this.extraArgs]
  }

  private getExecArgs(this: Manager) {
    return this.opts.inspect ? ['--inspect'] : []
  }
}
