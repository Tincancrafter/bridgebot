const CommunicationBridge = require('../contracts/CommunicationBridge')
const CommandHandler = require('./CommandHandler')
const StateHandler = require('./handlers/StateHandler')
const ErrorHandler = require('./handlers/ErrorHandler')
const ChatHandler = require('./handlers/ChatHandler')
const mineflayer = require('mineflayer')
const path = require('path')
const fs = require('fs')
class MinecraftManager extends CommunicationBridge {
  constructor(app) {
    super()

    this.app = app

    this.stateHandler = new StateHandler(this)
    this.errorHandler = new ErrorHandler(this)
    this.chatHandler = new ChatHandler(this, new CommandHandler(this))
  }

  connect() {
  this.bot = this.createBotConnection()

  // Mineflayer-level events
  this.bot.on('kicked', (reason, loggedIn) => {
    console.log('[MC] kicked loggedIn=', loggedIn, 'reason=', reason)
  })
  this.bot.on('end', (reason) => {
    console.log('[MC] end reason=', reason)
  })
  this.bot.on('error', (err) => {
    console.log('[MC] bot error:', err)
  })

  // Raw protocol-level disconnect (THIS is the money one)
  this.bot._client?.on?.('disconnect', (packet) => {
    console.log('[MC] client disconnect packet:', packet)
  })
  this.bot._client?.on?.('end', () => {
    console.log('[MC] client end')
  })
  this.bot._client?.on?.('error', (err) => {
    console.log('[MC] client error:', err)
  })

  this.errorHandler.registerEvents(this.bot)
  this.stateHandler.registerEvents(this.bot)
  this.chatHandler.registerEvents(this.bot)
}



  createBotConnection() {
  const host = process.env.SERVER_HOST ?? 'mc.hypixel.net'
  const port = Number(process.env.SERVER_PORT ?? 25565)

  const username = process.env.MINECRAFT_USERNAME
  const auth = (process.env.MINECRAFT_ACCOUNT_TYPE ?? 'microsoft')
  const version = process.env.MINECRAFT_VERSION ?? '1.21.11'

  if (!username) throw new Error('Missing MINECRAFT_USERNAME')

  const profilesFolder = '/srv/.mc-auth'
  try { fs.mkdirSync(profilesFolder, { recursive: true }) } catch {}

  console.log('[mc-auth] using profilesFolder:', profilesFolder)
  try { console.log('[mc-auth] contents before:', fs.readdirSync(profilesFolder)) } catch (e) { console.log('[mc-auth] read err:', e.message) }

  return mineflayer.createBot({
    host,
    port,
    username,
    auth,
    version,
    profilesFolder
  })
}



  onBroadcast({ username, message, replyingTo }) {
    this.app.log.broadcast(`${username}: ${message}`, 'Minecraft')

    if (this.bot.player !== undefined) {
      this.bot.chat(`/gc ${replyingTo ? `${username} replying to ${replyingTo}:` : `${username}:`} ${message}`)
    }
  }
}

module.exports = MinecraftManager
