import fs from 'fs'
import https from 'https'
import path from 'path'
import * as secretKey from '../../src/main/lib/secretKey'

/*
  Converts a log file from nomodbot legacy
*/

const clientId = secretKey.getKey('./main/cfg/keys.json', 'twitch', 'client-id')

const inputFilePath = path.join(__dirname, 'log.txt') // Legacy log file
const outputFilePath = path.join(__dirname, 'logOut.txt') // Output log file
const outputFilePath2 = path.join(__dirname, 'ids.json') // Output user id json file
const outputFilePath3 = path.join(__dirname, 'skippedLines.txt') // Discarded lines legacy format log file

const userNames: string[] = []

const ids: {[display: string]: number} = {}
const lowToHigh: {[lowcase: string]: string} = {}

const logLines = fs.readFileSync(inputFilePath, 'utf8').split('\n')

for (const line of logLines) {
  const split = line.split(':')
  if (split.length > 2) {
    const userName = split[2].toLowerCase()
    if (!(/^[a-zA-Z0-9_]*$/.test(userName))) continue
    if (isDoubleByte(userName)) continue
    if (userName.length < 3) continue
    if (userName.indexOf(' ') !== -1) continue
    if (userName && !userNames.includes(userName)) {
      userNames.push(userName)
    }
  }
}

function isDoubleByte(str: string) {
  for (let i = 0, n = str.length; i < n; i++) {
    if (str.charCodeAt(i) > 255) { return true }
  }
  return false
}

const total = userNames.length
const interval = setInterval(async () => {
  if (!userNames.length) {
    setTimeout(convertLog, 2000)
    clearInterval(interval)
    return console.log('userids received')
  }
  const spliced = userNames.splice(0, 99)
  const res = await getIds(spliced)
  for (const user of res) {
    if (user.display_name === 'MagusOfSomethings') {
      console.log('MagusOfSomethings >')
      console.log(user)
      console.log(res)
      console.log('< MagusOfSomethings')
    }
    ids[user.display_name] = ~~user.id
    lowToHigh[user.login] = user.display_name
  }
  console.log(`${Math.round(userNames.length / total * 100)}% remains (${userNames.length} / ${total})`)
}, 2500)

function getIds(displays: string[]): Promise<UsersResponse> {
  return new Promise((resolve) => {

    let query = ''
    for (const display of displays) {
      query += `login=${encodeURIComponent(display)}&`
    }

    const options = {
      host: 'api.twitch.tv',
      path: 'https://api.twitch.tv/helix/users?' + query,
      headers: {
        'client-id': clientId,
      },
    }
    https.get(options, (res) => {
      if (res.statusCode === 200) { // success!
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        }).on('end', () => {
          const result = JSON.parse(data)
          console.log(result.data)
          resolve(result.data)
        }).on('error', (err) => {
          console.error(err)
          resolve([])
        })
      } else {
        console.warn(res.statusMessage)
        console.warn(query)
        resolve([])
      }
    })
  })
}

function convertLog() {
  console.log('Write begin')
  let result = ''
  let skippedStr = ''
  let skipped = 0
  for (const line of logLines) {
    const split = line.split(':')
    if (split.length && split[2]) {
      const login = split[2].toLowerCase()
      split[2] = lowToHigh[login]
      if (split[2]) {
        split[2] = ids[split[2]].toString()
        if (split[2]) {
          result += split.join(':') + '\n'
        } else {
          skippedStr += line + '\n'
          skipped++
        }
      } else {
        skippedStr += line + '\n'
        skipped++
      }
    }
  }
  fs.writeFileSync(outputFilePath, result)
  fs.writeFileSync(outputFilePath3, skippedStr)
  fs.writeFileSync(outputFilePath2, JSON.stringify(ids, null, 2))
  console.log(`Write end. Skipped ${skipped} lines or ${Math.round(skipped / logLines.length * 100)}%`)
  process.exit(69420)
}

type UsersResponse = Array<{
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
