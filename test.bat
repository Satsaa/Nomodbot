
@echo off
IF EXIST bin\ (
  for %%a in (test\\*.js) do (
    node "%%a"
  )
  PAUSE
) ELSE (
  @echo on
  echo Compile before testing
  PAUSE
)
