// Global object may not make it in favor of better modularity
var nmb = {
  channels: {
    /*
      List of channels. All names that are of channels are prefixed by "#"
    */

    CHANNEL: {

      data: {
        /*
          Channel specific data that is preserved
          Data here changes regularly, without manual editing
          E.G. commandData.json, log.txt, counts.json, myiq.json, notifys.json, artifact card cache, dictionary cache
        */
      },
      prefs: {
        /*
          Channel specific data that is preserved
          Things here are meant to be editable and do not change without manual editing
        */
        config: {},
        commands: {}
      }
    }
  },
  global: {
    data: {
      internal: {
        messageTimes: {},
        whisperTimes: {},
        whisperTargets: {}
      }
    },
    prefs: {
      config: {
        masters: ['satsaa'],
        saveInterval: null,
        showMessages: false,
        message: {
          maxLength: 500,

          interval: 30000,
          userMax: 19,
          modMax: 99,
          userMinDelay: 1200,
          modMinDelay: 0
        },
        whisper: {
          maxLength: 500,

          intervalShort: 1000,
          intervalLong: 60000,
          minDelay: 334,
          maxLong: 59,
          maxShort: 2
        }
      }
    }
  }
}

/*
  dataHandler

  The dataHandler handles file loading, saving, unloading and defaults

  Predefined lists: channel and global
  Both controlled internally
  "channel":
    loaded on channel join
    unloaded on channel leave/process exit
  "global":
    loaded on bot start
    unloaded on exit

  Try to make a list class
*/

/*
  msgHandler

  Receives messages, parses them to desirable forms (array and raw), emits those forms so commands/plugins dont need to do it every time
  Handles sending, checking the messages for issues and fixing them, enforcing maxlength and such 
*/

/*
  cmdHandler

  Parses messages to useful formats for commands to use:
    message, words[], lowCase[], mainCaller, callers[]

  Handles options for comands like: Cooldowns, userlevels etc
  
  Response and keyword are commands and their functionality comes within them and not outside
*/

/*

*/
