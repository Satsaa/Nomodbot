module.exports = {
  "extends": "standard",
  "rules": {
    "allowNamedFunctions": false,
    "no-unused-vars": "off",
    "no-fallthrough": ["error", { "commentPattern": "no[\\s\\w]*break" }],
    "no-trailing-spaces": ["error", { "ignoreComments": true }],
    "no-inner-declarations": "off",
    "standard/no-callback-literal": "off"
  },
  "plugins": [
    "only-warn"
  ],
  "globals": {
    "nmb": true,
    "emitter": true
  }
};