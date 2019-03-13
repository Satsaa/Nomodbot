#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; If the script is not elevated, relaunch as administrator and kill current instance:

full_command_line := DllCall("GetCommandLine", "str")

if not (A_IsAdmin or RegExMatch(full_command_line, " /restart(?!\S)"))
{
    try ; leads to having the script re-launching itself as administrator
    {
        if A_IsCompiled
            Run *RunAs "%A_ScriptFullPath%" /restart
        else
            Run *RunAs "%A_AhkPath%" /restart "%A_ScriptFullPath%"
    }
    ExitApp
}

js = C:\Program Files\Microsoft VS Code\resources\app\extensions\javascript\snippets\javascript.json
ts = C:\Program Files\Microsoft VS Code\resources\app\extensions\typescript-basics\snippets\typescript.json

FileDelete, %js%
FileDelete, %ts%

FileAppend , {}, %js%
FileAppend , {}, %ts%
