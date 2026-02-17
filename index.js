'use strict'
process.title = 'Hypixel Discord Chat Bridge'

const app = require('./src/Application')
console.log('[runtime]', { node: process.version })
console.log("mineflayer", require("mineflayer/package.json").version);
console.log("minecraft-protocol", require("minecraft-protocol/package.json").version);

app
  .register()
  .then(() => {
    app.connect()
  })
  .catch(err => {
    console.error(err)
  })
