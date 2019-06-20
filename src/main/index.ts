import Bot from './Bot'
import { Manager } from './Manager'

let managed = false
for (const arg of process.argv) {
  if (arg === '-m' || arg === '--manager') {
    console.log('asdasdad')
    managed = true
  }
}

if (managed) {
  const manager = new Manager()
} else {
  process.on('multipleResolves', (e, p, v) => { throw new Error(`Mutiple ${e}s\nvalue: ${v}`) })
  process.on('unhandledRejection', (e) => { throw e })

  const bot = new Bot({masters: [61365582]})
  // Pass reference to Bot for debugging if not a managed instance
  if (!process.send) console.log(bot)
}
