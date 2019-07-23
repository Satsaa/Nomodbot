# Nomodbot
((((Under construction))))  
Twitch bot with not bad things in mind (name is up for reconsideration).

# Parameter Validator
The Parameter Validator validates user command calls against strings which describe what parameters are required.  

Each help string is validated from the first index to last. The first complete match will be accepted.  

Each command plugin should define validator strings and corresponding handlers with PluginLib#addCall. The command plugin has the following validator implementation in the constructor:  
```typescript
this.call = this.l.addCall(this, this.call, 'default', 'add <!COMMAND> <PLUGIN>', this.callAdd, this.cdAdd)
this.call = this.l.addCall(this, this.call, 'default', 'del <COMMAND>', this.callDelete, this.cdDelete)
```
The fourth parameters are the strings validated by the validator.  

`this.callAdd` is called when a user invokes !command with params "add", a nonexisting alias name, and a plugin id.
For example: `!command Add !usage help`.
`this.callDelete` is called when a user chats something like: `!command del !usage`.
Optionally if the alias was on cooldown `this.cdAdd` or `this.cdDelete` is called instead. 

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

Bold parameters are accepted by the validator. Row marked with ✅ is the matched validator string. Some parameters have further checks after this (e.g. "\<USER\>" is accepted for candidate if any string was defined in its place, but the existence of the user is checked aftwerwards).  

Below only the validator string is shown  

Validator strings, like in the quote command plugin:  
```javascript
'add <quote...>'
'del <INDEX>'
'[<INDEX>]'
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
'<message...>'
'<NUMBER> <message...>',
```
Input: `"999 My cool message"`  

| 999              | My               | ...              | Candidate |
| ---------------- | ---------------- | ---------------- | :-------: |
| **<message...>** | **<message...>** | **<message...>** |     ✅     |
| **\<NUMBER>**    | **<message...>** | **<message...>** |           |

Because of the order that the help strings were inputted, the second one can never be selected.

Now with reverse order of validator strings:

```javascript
'<NUMBER> <message...>'
'<message...>',
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
'<USER>'
'<not_user>', // Never reached
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
'0|1...'
'0|1|2|3|4|5|6|7|8|9...',
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
'<byte/^[01]{8}$/i>...'
'</([0-9a-f]{2}/i>...',
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
