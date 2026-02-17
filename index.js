'use strict'
process.title = 'Hypixel Discord Chat Bridge'

const app = require('./src/Application')
console.log('[runtime]', { node: process.version })
app
  .register()
  .then(() => {
    app.connect()
  })
  .catch(err => {
    console.error(err)
  })
