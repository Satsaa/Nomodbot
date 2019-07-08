# Nomodbot

Twitch bot with not bad things in mind (name is up for reconsideration).

# Parameter Validator
The Parameter Validator validates input messages against the usage instructions defined in a command plugin's `options.help` property.  

Each help string is validated from the first index to last. The first complete match will be accepted (some advanced variables are validated now).  

The typing for `options.help` can either be `helpString[]` or with grouping `{[group: string]: helpString[]}`. An alias with it's "group" property defined, will be matched against the appropriate group (default group is "default").  

If a help string doesn't have the character ":", it will be ignored for validating.

## Syntax

<details><summary>Expand</summary>

### Exact parameter
```
add | del | notcasesensitive | cAseSensitive
```
Accepted when the input is exactly the same (case-sensitive if the parameter name contains uppercase characters).  
Input is converted to lowercase if only lowercase characters were in the parameter  

### Variable parameter
```
<name> | <album> | <anything>
```
Always accepted if something was inputted (handling differs for [advanced types](#advanced-variable-parameter))

### Optional exact parameter
```
[override] | [force] | [CaseSensitive]
```
Accepted when the parameter is not defined or is exactly the same (case-sensitive if parameter name contains uppercase characters)  

### Optional variable parameter
```
[<name>] | [<default>] | [<track_number>]
```
Just like variable parameters but don't need to be defined. Following parameters must also be optional  

### Tuple parameter
```
add|del|edit | <this|that|reg/^thus$/i> | [1|2|3] | case|Sen|sitive
```
Accepted when one of the exact strings is matched. All of the strings are case-sensitive if any of them have an uppercase variable  
Input is converted to lowercase if only lowercase characters were in the tuple parameter  

### Multi-word parameter
```
777... | <message...> | [<reason...>] | <USERS...> | <0-1...> | 0|2...
```
Accepted when each of the upcoming words passes the check. No other parameter can follow  

### Advanced variable parameter
```
<USER> | <COMMAND> | <NUMBER> | <0-100> | <-Infinity-0> | <byte/^[01]{8}$/i>
```

**NUMBER**: Accepted if a valid number (Anything that doesn't convert to NaN with `+str`)  
**WORD**: Accepted if NOT a valid number (Anything that converts to NaN with `+str`)  
**INTEGER**, **INDEX**: Accepted if a valid whole number  
**Range (X-Y)**: Accepts numbers between the lowest inputted number and the highest (inclusive). Negative values are typed like "<-100--90>".  
Accepts whole numbers if none of the numbers had a decimal place, otherwise, fractions are allowed  
**Regexp (name/regex/flags)**: Accepts anything that matches with the regex  


The following parameters are accepted as valid if the parameter is defined but a message is returned if the check is not passed.  

**USER**, **CHANNEL**: Checks for the existence of the inputted user. Input is converted to user ids   
**COMMAND**: Checks that the inputted command exists. Input is converted to lowercase  
**!COMMAND**: Checks that the inputted command DOESN'T exists. Input is converted to lowercase  
**PLUGIN**: Checks that the inputted plugin (by id) exists. Input is converted to lowercase  
**!PLUGIN**: Checks that the inputted plugin (by id) DOESN'T exists. Input is converted to lowercase  

Plural versions are also accepted, INDEX -> INDEXES or USER -> USERS and so on.  

</details>

## Examples

<details><summary>Expand</summary>

Bold parameters are accepted

**Help string are no longer used for parameter validation in this way**  
**You should now use PluginLibary#addCall**(*this*, *this.call*, *group*, ***helpString***, *handler*) **for each help entry**  
**Replace *helpString* with a string like `add <quote...>` (The explanation and {alias} should not not included)**

Help strings, like in the quote command plugin:  
```javascript
help: [  
  'Add a new quote: {alias} add <quote...>',
  'Delete a quote: {alias} del <INDEX>',
  'Show quote: {alias} [<INDEX>]',
  'Edit quotes', // Ignored for validation (has no ':')
]  
```
Input: `"add "99 problems but physics aint one" - Albert Einstein, 1923"`  

| add        | 99             | ...            | Candidate |
| ---------- | -------------- | -------------- | :-------: |
| **add**    | **<quote...>** | **<quote...>** |     ✅     |
| del        | **\<INDEX>**   |                |           |
| [\<INDEX>] |                |                |           |

---

### Order matters

```javascript
help: [  
  'Define a new default message: {alias} <message...>',
  'Define a new number message: {alias} <NUMBER> <message...>',
]  
```
Input: `"999 My cool message"`  

| 999              | My               | ...              | Candidate |
| ---------------- | ---------------- | ---------------- | :-------: |
| **<message...>** | **<message...>** | **<message...>** |     ✅     |
| **\<NUMBER>**    | **<message...>** | **<message...>** |           |

Because of the order that the help strings were inputted, the second one can never be selected.

Now with reverse order of help strings:

```javascript
help: [  
  'Define a new number message: {alias} <NUMBER> <message...>',
  'Define a new default message: {alias} <message...>',
]  
```
Input: `"999 My 999th message"`  

| 999              | My               | ...              | Candidate |
| ---------------- | ---------------- | ---------------- | :-------: |
| **\<NUMBER>**    | **<message...>** | **<message...>** |     ✅     |
| **<message...>** | **<message...>** | **<message...>** |           |

Input: `"The defaultly cool message"`  

| 999              | My               | ...              | Candidate |
| ---------------- | ---------------- | ---------------- | :-------: |
| \<NUMBER>        | **<message...>** | **<message...>** |           |
| **<message...>** | **<message...>** | **<message...>** |     ✅     |

---

### USER parameter

```javascript
help: [  
  'Ping user: {alias} <USER>',
  'Something else: {alias} <not_user>', // Never reached
]  
```

Input: `"archimo"`  

| archimo        | Candidate |
| -------------- | :-------: |
| **\<USER>**    |     ✅     |
| **<not_user>** |           |

Expectedly the first one is selected because it is a valid user (**this is not why it was selected**)  
\<USER> parameters are also converted to user id's when passed to the command plugin.

Input: `"not-real-user"`  

| not-real-user  | Candidate |
| -------------- | :-------: |
| **\<USER>**    |     ✅     |
| **<not_user>** |           |

The first one is again selected, because \<USER>, \<COMMAND> and \<PLUGIN> accept ANY defined inputs BUT an error message is returned when that user/command/plugin is not found.

Output: `"Cannot find user (param 1)"`  

---

### Tuple parameter

```javascript
help: [  
  'Binary data: {alias} 0|1...',
  'Decimals: {alias} 0|1|2|3|4|5|6|7|8|9...',
]  
```

Input: `"0 0 1 1 1 0 1 0 0 0 1 0 1 0 0 1"`  

| 0                                   | ...                                 | Candidate |
| ----------------------------------- | ----------------------------------- | :-------: |
| **0\|1...**                         | **0\|1...**                         |     ✅     |
| **0\|1\|2\|3\|4\|5\|6\|7\|8\|9...** | **0\|1\|2\|3\|4\|5\|6\|7\|8\|9...** |           |

Input: `"0 1 9"`  

| 0                                   | 1                                   | 9                                   | Candidate |
| ----------------------------------- | ----------------------------------- | ----------------------------------- | :-------: |
| **0\|1...**                         | **0\|1...**                         | 0\|1...                             |           |
| **0\|1\|2\|3\|4\|5\|6\|7\|8\|9...** | **0\|1\|2\|3\|4\|5\|6\|7\|8\|9...** | **0\|1\|2\|3\|4\|5\|6\|7\|8\|9...** |     ✅     |

---

### Regular Expressions

```javascript
help: [  
  'Byte data: {alias} <byte/^[01]{8}$/i>...',
  'Hex data: {alias} </([0-9a-f]{2}/i>...',
]  
```

Input: `"00111010 00101001"`  

| 00111010                  | 00101001                  | Candidate |
| ------------------------- | ------------------------- | :-------: |
| **<byte/^[01]{8}$/i>...** | **<byte/^[01]{8}$/i>...** |     ✅     |
| </([0-9a-f]{2}/i>...      | </([0-9a-f]{2}/i>...      |           |

Input: `"3A 29"`  

| 3A                       | 29                       | Candidate |
| ------------------------ | ------------------------ | :-------: |
| <byte/^[01]{8}$/i>...    | <byte/^[01]{8}$/i>...    |           |
| **</([0-9a-f]{2}/i>...** | **</([0-9a-f]{2}/i>...** |     ✅     |

</details>

---

[Back to Top](#nomodbot)
