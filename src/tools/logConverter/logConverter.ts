import fs from 'fs'
import https from 'https'

import * as secretKey from '../../main/lib/secretKey'

const input = './src/main/tools/logConverter/log.txt',
      output = './src/main/tools/logConverter/output.json',

  /*
  Converts a log file from nomodbot 0.2
  {id: display} -> [uid, login, display][]
*/

      clientId = secretKey.getKey('./cfg/keys.json', 'twitch', 'client-id'),

      rawFile = fs.readFileSync(input, 'utf8')

console.log('Parsing input')

const seen: {[a: string]: 1} = {},
      inputIds = rawFile
        .split('\n') // Split to log lines
        .map((v, i, arr) => (v.match(/:c:([^:]*)/) || [])[1]) // Extract id from log line
        .filter(v => typeof v === 'string') // Remove non string
        .filter((elem, index, self) => { // Remove duplicates (takes long)
          if (seen[elem]) {
            return false
          } else {
            seen[elem] = 1
            return true
          }
        }),

      input100: string[][] = []
inputIds.forEach((v, i) => {
  const index100 = Math.floor(i / 100)
  if (!input100[index100]) input100[index100] = []
  input100[index100].push(v)
  if (input100[index100].length > 100) throw new Error('wtf too long')
})
console.log(`Input handled. ${inputIds.length} user(s)`)

const outputArr: Array<[number, string, string]> = []
;(async () => {
  // get data from API
  let index = 0
  for (const ids of input100) {
    index++
    console.log(`${index}/${input100.length} ${Math.floor(index / input100.length * 100)}%`)
    await new Promise(resolve => setTimeout(resolve, 2500))
    console.log(`Getting ${ids.length} user(s)`)

    const res = await getUsers(ids)
    let total = 0
    for (const user of res) {
      if (user.id && user.login && user.display_name) {
        total++
        outputArr.push([~~user.id, user.login, user.display_name])
      }
    }
    console.log(`Got ${total} user(s)`)
  }
  // Write data to output
  fs.writeFileSync(output, JSON.stringify(outputArr, null, 2))
})()

function getUsers(ids: string[]): Promise<UsersResponse> {
  return new Promise((resolve) => {
    let query = ''
    for (const id of ids) {
      query += `id=${encodeURIComponent(id)}&`
    }

    const options = {
      host: 'api.twitch.tv',
      path: `https://api.twitch.tv/helix/users?${query}`,
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
