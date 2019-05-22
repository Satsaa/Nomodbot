
@echo off
IF EXIST bin\ (
  for %%a in (misc\\test\\*.js) do (
    node "%%a"
  )
  PAUSE
) ELSE (
  @echo on
  echo Compile before testing. Also compile when testing new changes.
  PAUSE
)
