# Source


# Command Plugins

## afk
!afk (message...)

Notify afk users with a custom message
- !afk marks a user as afk until they write again in chat
- Notify users that directly mention an afk user
- Like: *mentioner* *afkuser* is afk(: *message*)
- Should not notify if already done so recently (minimum lines between notifies? or time)
- Don't notify a user that already received a notify?

## circle
!circle [outer]
!circle [inner] [outer] (outerN...)

Shows a message that visually shows an emote surrounded by 6 other emotes
- *inner* and *outer* are expected to be emotes but may be text
- Emote only is possible but need ffz, bttv and subscriber emote data to allow those emotes
- If more than one *outer* emote is defined, switch between them in the order inputted
- Expects 1, 2, 3 or 6 outer emotes for symmetry
- If 4, 5 or >6 outer emotes are given, only use the first 3 or 6 emotes

## slots
!slots (bet)

Shows a message with 3 random emotes and gives points based on that
- Bad odds
- Point weight based on what emote (PogChamp high points, LUL low points etc.)
- No combo = ~ 0 x EmoteWeight x bet
- 2x same emote = ~ 0.5 x EmoteWeight x bet
- 3x same emote = ~ 10 x EmoteWeight x bet
- Subscriber emotes give extra points (rare) (requires subscription of bot)

## Schedule
!schedule (now | next)  
!schedule set [calendarLink]  

Shows the current or an upcoming event of the linked calendar app  
Could support timed messages (periodically spam the upcoming event etc)  

## Plugins
!plugins (type...)

Lists plugins  

## Combo
!combo enable|disable
!combo STRING minCount

Emote combo announcements
- Only send the combo when the combo ends (different emote is sent or timeout)

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
A command should be added for getting the list of plugins supporting timed messages  
