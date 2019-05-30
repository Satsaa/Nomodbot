
# Source

## Data file types
Support file types and derive types from the file type

- .txt: string, .json: object, .map: map,  

## Add qol features to command plugins

### parameter type checking
- Could use syntax like: "exact <variable> [optional] [<optional_var>] <NUMBER> <USER> <multiword_var...>"
- Could also be merged into help strings. Then syntax would be: "Action explanation: exact <variable> [optional]"
  - Forbids use of ":" except once before parameters
- Case never matters for an input but uppercase fields are types
- Advanced types like "USER" will check if a user with that login name exists and converts the field to an userid
- Multiwords always last
- Can have multiple strings. Prioritizes first strings
- First string with all params present will call the command
- Example: for !response
  - edit <command> <response...>

## Data loaders and unloaders

Options for loader and unloader functions
Run loader on the loaded data
Run unloader on a clone of the data before unloading

# Command Plugins

## Streamdays
!days !streamdays

Tells the probability of streams per day
- Just* like !streamtimes
- Uses average of streams within time period instead of average of N streams
- Time period must be divisible by 7 days

## Crime count
!crimes

Tells and tracks the amount of times a user has been timedout
- Implement log line types (eg timeouts subs and such)

## afk
!afk (message...)

Notify afk users with a custom message
- !afk marks a user as afk until they write again in chat
- Notify users that directly mention an afk user
- Like: *mentioner* *afkuser* is afk(: *message*)
- Should not notify if already done so recently (minimum lines between notifies? or time)
- Don't notify a user that already received a notify?

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

## Combo
!combo enable|disable
!combo minimum (count)

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
A command should be added for getting the list of plugins supporting timed messages  
