
import https from 'https'

const clientId = '',
      token = '',

      opts = {
        host: 'id.twitch.tv',
        path: `/oauth2/revoke?client_id=${clientId}&token=${token}`,
        method: 'POST',
      }
https.get(opts, (res: any) => {
  if (res.statusCode === 200) { // success!
    console.log(res.statusMessage)
  } else {
    console.log(res)
    console.error(res.statusMessage)
  }
})
