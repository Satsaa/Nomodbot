import { fork } from 'child_process'
import path from 'path'
import { onExit } from '../main/lib/util'

console.log('Manager started')

let child = fork(path.join(__dirname, '/index'), [], {cwd: process.cwd(), stdio: 'inherit'})

let autoRestart = true
let autoRestartNext = false
let ignoreExit = false
let args: string[] = []

registerEvents()

onExit(() => {
  console.error('Manager exit')
})

// Events

function onMessage(msg: {cmd: string, val: any}) {
  try {
    if (!msg.cmd) return
    const cmd = msg.cmd + ''
    const val = msg.val
    switch (cmd) {
      case 'KILL':
        process.exit()
        break
      case 'AUTO_RESTART_NEXT':
        autoRestartNext = typeof val === undefined ? true : val
        break
      case 'AUTO_RESTART':
        autoRestart = typeof val === undefined ? true : val
        break
      case 'SET_ARGS':
        args = Array.isArray(val) ? val : []
        break
      case 'PUSH_ARGS':
        if (Array.isArray(val)) args.push(...(val.map(v => v + '')))
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

function onChildClose() {
  if (ignoreExit) return
  if (autoRestart || autoRestartNext) {
    autoRestartNext = false
    gracedBirth()
  } else {
    console.log('Manager exiting')
    process.exit()
  }
}

// Methods

function registerEvents() {
  child.on('message', onMessage)
  child.on('close', onChildClose)
}

function gracedBirth() {
  if (child.once) birth()
  else child.once('close', birth)

  function birth() {
    child = fork(path.join(__dirname, '/index'), args, {cwd: process.cwd(), stdio: 'inherit'})
    args = []
    registerEvents()
    ignoreExit = false
  }
}
