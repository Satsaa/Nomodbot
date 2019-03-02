@echo off
cd bin\
for %%a in (test\\*.js) do (
node "%%a"
)
PAUSE