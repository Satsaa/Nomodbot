
# Source

## Local user database 
MySql?

## Start using maps

## Make whitelist & blacklist grouped and per plugin

## Allow @user for user parameters
!notify @user  
!notify user  

## Provide max length when calling command plugins
Helps plugins limiting message lengths with accurate variables  

## Vital flag for command plugins
Prevent extinction of command plugins that have this flag enabled  
E.g. dont allow deletion of the last alias of the "command" plugin, because that command is needed for editing commands and without it you couldn't

## Data file types
Support file types and derive types from the file type  

- .txt: string, .json: object, ~~.map: map~~,  .table: map?

## Data loaders and unloaders

Options for loader and unloader functions  
Run loader on the loaded data  
~~Run unloader on a clone of the data before unloading~~  
Run unloader on the object but remove object from Data#data to  

## Optional per alias cooldowns
Aliases created by ?response share cooldown  

- Add alias property cooldownId  
- Value is a string  
- generate unique id, so copies share cooldown?  

## Cleanup for expired cooldowns
- Onexit and/or intervalled cleaner function  
- Removes cooldown entries that don't matter anymore  

# Command Plugins

##remind create reminders
!remind \<timeString>  

## vanish
!vanish  
Timeouts the user for 1 sec duh  

## Long timeouts
More than 2 weeks timeout

## Trivia
!trivia start [\<category>]  
!trivia stop  

- Asks users questions
- Normal users can start a trivia only when stream is offline
- Weight categories towards recently played games
- It would be good to get some questions from game APIs so they self-update
- Multigategories
  - Categories that contain multiple single categories
  - Valve: Dota2, Underlords, Artifact, CS:GO etc.
- Hardcoded categories can utilize functions
- Custom categories per channel
- Hints showing partial answer
- Custom hints for hardcoded questions allowed

## afk
!afk [<message...>]  

Notify afk users with a custom message
- !afk marks a user as afk until they write again in chat
- Notify users that directly mention an afk user
- Like: *mentioner* *afkuser* is afk(: *message*)
- Should not notify if already done so recently (minimum lines between notifies? or time)
- Don't notify a user that already received a notify?

## slots
!slots \<bet>  

Shows a message with 3 random emotes and gives points based on that
- Bad odds
- Point weight based on what emote (PogChamp high points, LUL low points etc.)
- No combo = ~ 0 x EmoteWeight x bet
- 2x same emote = ~ 0.5 x EmoteWeight x bet
- 3x same emote = ~ 10 x EmoteWeight x bet
- Subscriber emotes give extra points (rare) (requires subscription of bot)
- Slot categories (pepe frogs, etc.)

## Schedule
!schedule now|next  
!schedule set \<calendarLink>  

Shows the current or an upcoming event of the linked calendar app  
Could support timed messages (periodically spam the upcoming event etc)  

## Combo
!combo enable|disable  
!combo minimum \<count>  

Emote combo announcements
- Only send the combo when the combo ends (different emote is sent or timeout)
- Track combo records

# Controller Plugins

## Custom options for plugins

Plugins can pass an object that defines special options and their types  
Use the extension api to pass the options  
The settings can be called by the plugin through the extension api (similar to the list controller)  
An option can be channel specific or global?  
The "accepts" key might have a value like: `"string", "number", "positive", "boolean", (v) => boolean`
<pre>
{
  global: {
    optionName: {
      name: "Doodat"
      info: "controls this and that",
      accepts: "positive"
    }
  },
  channel: {
    optionName...
  }
}
</pre>

## Timed functions for plugins

Allows creating timed messages via the extension api  
Timers should be paused when chat is not active  
Timers shouldn't activate if last message is from bot (prevent spam when dead chat)  
extend $plugins to display plugins with  
