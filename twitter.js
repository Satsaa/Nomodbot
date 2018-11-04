
var Twitter = require('twitter')

const opts = require('./config/TwitterClient.json')

var client = new Twitter({
  consumer_key: opts.consumer_key,
  consumer_secret: opts.consumer_secret,
  access_token_key: opts.access_token_key,
  access_token_secret: opts.access_token_secret
})

// STANDARD STREAMING PARAMETERS -> https://developer.twitter.com/en/docs/tweets/filter-realtime/guides/basic-stream-parameters
// Trump: 25073877 | 3minbot: 2899773086 | Dota2: 176507184 | wykrhm: 44680622
// Artifact: 891000584836235265 | IceFrog: 17388199 | self: 917998149309992962
// ThinkingBottle: 987819021574770688 | Miki: 2355369798 | Baumi: 2835634330
// var stream = client.stream('statuses/filter', {track: 'picture'});
var stream = client.stream('statuses/filter', {
  follow: '176507184,44680622,891000584836235265,17388199,917998149309992962,987819021574770688,2355369798'
})

stream.on('error', (error) => {
  throw error
})

let alertChannels = ['#satsaa', '#l34um1']

stream.on('data', (tweet) => {
  if (!tweet || tweet.in_reply_to_user_id_str != null || ('retweeted_status' in tweet)) return // replies are ignored as they are likely retweets
  console.log(`* Tweet from @${tweet.user.screen_name}: https://twitter.com/statuses/${tweet.id_str}`)
  // console.log(tweet)
  if (!tweet.extended_tweet && typeof tweet.entities.media !== 'undefined' && tweet.entities.media[0].media_url) {
    console.log(`* Media: ${tweet.entities.media[0].media_url}`)
    console.log(`* Waiting for caption...`)
    let imageUrl = tweet.entities.media[0].media_url
    captionURL(imageUrl).then((caption) => {
      console.log(`* Caption: ${caption}`)
      if (caption) caption = ' ⠀⠀⠀⠀ Image of ' + caption

      noModBot.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.text.substring(0, tweet.display_text_range[1])}
      twitter.com/statuses/${tweet.id_str}
      ${caption || tweet.entities.media[0].media_url}`)
    }).catch((err) => {
      console.log(`* Caption failed: ${err}`)

      noModBot.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.text.substring(0, tweet.display_text_range[1])}
      twitter.com/statuses/${tweet.id_str}
      ${tweet.entities.media[0].media_url}`)
    })
  } else if ((((tweet || {}).extended_tweet || {}).entities || {}).media && tweet.extended_tweet.entities.media[0].media_url) {
    console.log(`* Media: ${tweet.extended_tweet.entities.media[0].media_url}`)
    console.log(`* Waiting for caption...`)
    let imageUrl = tweet.extended_tweet.entities.media[0].media_url
    captionURL(imageUrl).then((caption) => {
      if (caption) caption = ' ⠀⠀⠀⠀ Image of ' + caption

      noModBot.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.extended_tweet.full_text.substring(0, tweet.extended_tweet.display_text_range[1])}
      twitter.com/statuses/${tweet.id_str}
      ${caption || tweet.extended_tweet.entities.media[0].media_url}`)
    }).catch((err) => {
      console.log(err)

      noModBot.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
      ${tweet.extended_tweet.full_text.substring(0, tweet.extended_tweet.display_text_range[1])}
      twitter.com/statuses/${tweet.id_str}
      ${tweet.extended_tweet.entities.media[0].media_url}`)
    })
  } else {
    noModBot.msgHandler.chat(alertChannels, `New tweet from @${tweet.user.screen_name} ${getEmote(tweet.user.id_str)} 
    ${tweet.extended_tweet && tweet.extended_tweet.full_text ? tweet.extended_tweet.full_text : tweet.text}
    twitter.com/statuses/${tweet.id_str}`)
  }
})

function getEmote (id) {
  switch (parseInt(id, 10)) {
    case 25073877: // Trump
      return 'KKona 🇺🇸'
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

// deepai api
// Example posting an image URL:

const deepAi = require('./config/DeepAi.json')
var request = require('request')

function captionURL (URL) {
  return new Promise((resolve, reject) => {
    request.post({
      url: 'https://api.deepai.org/api/neuraltalk',
      headers: {
        'Api-Key': deepAi['Api-Key']
      },
      formData: {
        'image': URL
      }
    }, (err, httpResponse, body) => {
      if (err) {
        reject(new Error('request failed: ' + err))
      }
      var response = JSON.parse(body)
      resolve(response.output)
    })
  })
}

// Example posting a local image file:

var fs = require('fs')
// var request = require('request')

function captionFile (path) {
  request.post({
    url: 'https://api.deepai.org/api/neuraltalk',
    headers: {
      'Api-Key': deepAi['Api-Key']
    },
    formData: {
      'image': fs.createReadStream(path)
    }
  }, (err, httpResponse, body) => {
    if (err) {
      console.error('request failed:', err)
      return
    }
    var response = JSON.parse(body)
    console.log(response)
  })
}
