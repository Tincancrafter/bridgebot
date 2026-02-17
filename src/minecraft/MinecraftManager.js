const CommunicationBridge = require('../contracts/CommunicationBridge')
const CommandHandler = require('./CommandHandler')
const StateHandler = require('./handlers/StateHandler')
const ErrorHandler = require('./handlers/ErrorHandler')
const ChatHandler = require('./handlers/ChatHandler')
const mineflayer = require('mineflayer')

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

  this.bot.on('kicked', (reason, loggedIn) => {
    console.log('[MC] kicked. loggedIn=', loggedIn, 'reason=', reason)
  })

  this.bot.on('error', (err) => {
    console.log('[MC] error:', err)
  })

  this.bot.on('end', () => {
    console.log('[MC] connection ended')
  })

  this.errorHandler.registerEvents(this.bot)
  this.stateHandler.registerEvents(this.bot)
  this.chatHandler.registerEvents(this.bot)
}


  createBotConnection() {
  const host = process.env.SERVER_HOST ?? this.app.config?.server?.host ?? 'mc.hypixel.net'
  const port = Number(process.env.SERVER_PORT ?? this.app.config?.server?.port ?? 25565)

  const username = process.env.MINECRAFT_USERNAME ?? this.app.config?.minecraft?.username
  const password = process.env.MINECRAFT_PASSWORD ?? this.app.config?.minecraft?.password

  const auth = process.env.MINECRAFT_ACCOUNT_TYPE ?? this.app.config?.minecraft?.accountType ?? 'microsoft'
  const version = process.env.MINECRAFT_VERSION ?? '1.21.11'

  if (!username) throw new Error('Missing MINECRAFT_USERNAME')

  return mineflayer.createBot({
    host,
    port,
    username,
    password,
    auth,
    version,

    // Persist Microsoft auth + profile cache between restarts
    profilesFolder: './.mc-auth'
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
