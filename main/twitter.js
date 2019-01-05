
var Twitter = require('twitter')

var client = new Twitter(require('../keyConfig/TwitterClient.json'))

// STANDARD STREAMING PARAMETERS -> https://developer.twitter.com/en/docs/tweets/filter-realtime/guides/basic-stream-parameters
// Trump: 25073877 | 3minbot: 2899773086 | Dota2: 176507184 | wykrhm: 44680622
// Artifact: 891000584836235265 | IceFrog: 17388199 | self: 917998149309992962
// ThinkingBottle: 987819021574770688 | Miki: 2355369798 | Baumi: 2835634330
// SparkMoba: 1042789584021729280

var stream = client.stream('statuses/filter', {
  follow: '176507184,44680622,1042789584021729280,891000584836235265,17388199,917998149309992962,987819021574770688,2355369798'
})

stream.on('error', (error) => {
  if (error.toString().startsWith('Error: Status Code: ')) {
    let status = getStatus(+error.toString().substring(20))
    console.error(`* [TWITTER ERROR] ${status.short}: ${status.long}`)
  } else {
    console.error(`* [TWITTER ERROR] ${error}`, error.stack)
  }
})

let alertChannels = ['#satsaa', '#l34um1']

stream.on('data', (tweet) => { // just formatting and sending the message
  if (!tweet || tweet.in_reply_to_user_id_str != null || ('retweeted_status' in tweet)) return // replies are ignored as they are likely retweets
  console.log(`* Tweet from @${tweet.user.screen_name}: twitter.com/statuses/${tweet.id_str}`)
  // console.log(tweet)
  if (!tweet.extended_tweet && (((tweet.entities || {}).media || {})[0] || {}).media_url) {
    console.log(`* Media: ${tweet.entities.media[0].media_url}`)
    console.log(`* Waiting for caption...`)
    let imageUrl = tweet.entities.media[0].media_url
    describeUrl(imageUrl).then((caption) => {
      console.log(`* Caption: ${caption}`)
      if (caption) caption = ' Image of ' + caption

      nmb.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.text.substring(0, tweet.display_text_range[1])}
      twitter.com/i/web/status/${tweet.id_str}/ ⠀
      ${caption || tweet.entities.media[0].media_url}`)
    }).catch((err) => {
      console.error(`* [TWITTER] Caption failed: ${err}`)

      nmb.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.text.substring(0, tweet.display_text_range[1])}
      twitter.com/i/web/status/${tweet.id_str}/ ⠀
      ${tweet.entities.media[0].media_url}`)
    })
  } else if ((((((tweet || {}).extended_tweet || {}).entities || {}).media || {})[0] || {}).media_url) {
    console.log(`* Media: ${tweet.extended_tweet.entities.media[0].media_url}`)
    console.log(`* Waiting for caption...`)
    let imageUrl = tweet.extended_tweet.entities.media[0].media_url
    describeUrl(imageUrl).then((caption) => {
      console.log(`* Caption: ${caption}`)
      if (caption) caption = ' Image of ' + caption

      nmb.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.extended_tweet.full_text.substring(0, tweet.extended_tweet.display_text_range[1])}
      twitter.com/i/web/status/${tweet.id_str} ⠀
      ${caption || tweet.extended_tweet.entities.media[0].media_url}`)
    }).catch((err) => {
      console.error(`* [TWITTER] Caption failed: ${err}`)

      nmb.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.extended_tweet.full_text.substring(0, tweet.extended_tweet.display_text_range[1])}
      twitter.com/i/web/status/${tweet.id_str}/ ⠀
      ${tweet.extended_tweet.entities.media[0].media_url}`)
    })
  } else {
    nmb.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
    ${tweet.extended_tweet && tweet.extended_tweet.full_text ? tweet.extended_tweet.full_text : tweet.text}
    twitter.com/i/web/status/${tweet.id_str}/ ⠀`)
  }
})

// Microsoft Azure cognitive/ddescription api
// https://westeurope.api.cognitive.microsoft.com/

const azure = require('../keyConfig/CognitiveServices.json')
var request = require('request')

function describeUrl (imageUrl) {
  return new Promise((resolve, reject) => {
    if (!azure.key) {
      reject(new Error('No api key')) // no known key
      return
    }
    const uriBase = `${azure.endpoint}vision/v2.0/analyze`
    const requestParams = {
      'visualFeatures': 'Categories,Description,Color',
      'details': 'Celebrities,Landmarks',
      'language': 'en'
    }
    const options = {
      uri: uriBase,
      qs: requestParams,
      body: `{"url":"${imageUrl}"}`,
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': azure.key
      }
    }

    request.post(options, (error, response, body) => {
      if (error) return reject(new Error(error))
      body = JSON.parse(JSON.stringify(JSON.parse(body), null, '  ')) // Objectify json string

      if (typeof body.description !== 'undefined' && ((body.description.captions[0] || {}).text)) resolve(body.description.captions[0].text)
      else reject(new Error('No caption returned'))
    })
  })
}

// strings for specific tweeters

function getEmote (id) {
  switch (parseInt(id, 10)) {
    case 25073877: // Trump
      return 'KKona 🇺🇸'
    case 1042789584021729280: // spark moba
      return '✨'
    case 2899773086: // 3 minbot
      return '🕒'
    case 176507184: // Dota 2
      return 'GabeN'
    case 44680622: // Wykrhm
      return 'OSFrog'
    case 891000584836235265: // Artifact
      return '🃏'
    case 17388199: // IceFrog
      return 'OSFrog'
    case 917998149309992962: // Satsaa
      return '🔧'
    case 987819021574770688: // Thinking Bottle
      return 'baumiThinking'
    case 2355369798: // Miki
      return '👉🚪'
    case 2835634330: // Baumi
      return 'baumiW'
    default:
      return '🐦'
  }
}

// Explanation for status codes

function getStatus (code) {
  let short = 'OK'
  let long = 'Success!'
  switch (code) {
    case 200:
      short = 'OK'
      long = 'Success!'
      break
    case 304:
      short = 'Not Modified'
      long = 'There was no new data to return.'
      break
    case 40:
      short = 'Bad Request'
      long = 'The request was invalid or cannot be otherwise served. An accompanying error message will explain further. Requests without authentication are considered invalid and will yield this response.'
      break
    case 401:
      short = 'Unauthorized'
      long = 'Missing or incorrect authentication credentials. This may also returned in other undefined circumstances.'
      break
    case 403:
      short = 'Forbidden'
      long = 'The request is understood, but it has been refused or access is not allowed. An accompanying error message will explain why. This code is used when requests are being denied due to update limits . Other reasons for this status being returned are listed alongside the error codes in the table below.'
      break
    case 404:
      short = 'Not Found'
      long = 'The URI requested is invalid or the resource requested, such as a user, does not exist. '
      break
    case 406:
      short = 'Not Acceptable'
      long = 'Returned when an invalid format is specified in the request.'
      break
    case 410:
      short = 'Gone'
      long = 'This resource is gone. Used to indicate that an API endpoint has been turned off.'
      break
    case 420:
      short = 'Enhance Your Calm'
      long = 'Returned when an app is being rate limited for making too many requests.'
      break
    case 422:
      short = 'Unprocessable Entity'
      long = 'Returned when the data is unable to be processed (for example, if an image uploaded to POST account / update_profile_banner is not valid, or the JSON body of a request is badly-formed).'
      break
    case 429:
      short = 'Too Many Requests'
      long = 'Returned when a request cannot be served due to the app\'s rate limit having been exhausted for the resource. See Rate Limiting.'
      break
    case 500:
      short = 'Internal Server Error'
      long = 'Something is broken. This is usually a temporary error, for example in a high load situation or if an endpoint is temporarily having issues. Check in the developer forums in case others are having similar issues,  or try again later.'
      break
    case 502:
      short = 'Bad Gateway'
      long = 'Twitter is down, or being upgraded.'
      break
    case 503:
      short = 'Service Unavailable'
      long = 'The Twitter servers are up, but overloaded with requests. Try again later.'
      break
    case 504:
      short = 'Gateway timeout'
      long = 'The Twitter servers are up, but the request couldn’t be serviced due to some failure within the internal stack. Try again later.'
      break
    default:
      short = 'Unknown ' + code
      long = 'Unknown status code ' + code
      break
  }
  return { 'short': short, 'long': long }
}
