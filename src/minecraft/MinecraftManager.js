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

    // Mineflayer-level events (clean, non-duplicated)
    this.bot.on('kicked', (reason, loggedIn) => {
      console.log('[MC] kicked loggedIn=', loggedIn, 'reason=', reason)
    })

    this.bot.on('end', (reason) => {
      console.log('[MC] end reason=', reason)
    })

    this.bot.on('error', (err) => {
      console.log('[MC] bot error:', err)
    })

    // Raw protocol-level events
    const c = this.bot._client
    if (c?.on) {
      c.on('end', () => console.log('[MC] client end'))
      c.on('error', (err) => {
        const msg = String(err?.message || err)
        console.log('[MC] client error:', err)

        // If Hypixel rate-limits (rare), cool down reconnects if your StateHandler supports it
        if (msg.includes('Status code: 429')) {
          this.stateHandler?.forceCooldown?.(20 * 60_000) // 20 minutes
        }
      })

      // Some versions emit disconnect via packets rather than an event
      c.on('packet', (data, meta) => {
        if (!meta?.name) return
        if (meta.name === 'disconnect' || meta.name === 'kick_disconnect') {
          console.log('[MC] DISCONNECT PACKET:', meta.name, data)
        }
      })
    }

    this.errorHandler.registerEvents(this.bot)
    this.stateHandler.registerEvents(this.bot)
    this.chatHandler.registerEvents(this.bot)
  }

  createBotConnection() {
    const host = process.env.MINECRAFT_HOST ?? this.app.config?.server?.host ?? 'mc.hypixel.net'
    const port = Number(process.env.MINECRAFT_PORT ?? this.app.config?.server?.port ?? 25565)
    const username = process.env.MINECRAFT_USERNAME ?? this.app.config?.minecraft?.username

    const auth = process.env.MINECRAFT_ACCOUNT_TYPE ?? this.app.config?.minecraft?.accountType ?? 'microsoft'
    const profilesFolder = process.env.MINECRAFT_PROFILES ?? '/srv/.mc-auth'

    if (!username) throw new Error('Missing MINECRAFT_USERNAME')

    // IMPORTANT:
    // - DO NOT pass `false` for version (breaks).
    // - If unset, use `undefined` so mineflayer picks its default.
    // - If you want to force a version, set MINECRAFT_VERSION to a string.
    const versionEnv = process.env.MINECRAFT_VERSION
    const version = (typeof versionEnv === 'string' && versionEnv.trim().length > 0) ? versionEnv.trim() : undefined

    console.log('[MC cfg]', {
      host,
      port,
      version: version ?? '(auto)',
      auth,
      username: 'set',
      profilesFolder
    })

    const bot = mineflayer.createBot({ host, port, username, auth, version, profilesFolder })

    // High-signal debugging
    bot.once('connect', () => console.log('[MC] connect'))
    bot.once('login', () => console.log('[MC] login'))
    bot.once('spawn', () => console.log('[MC] spawn'))

    // ---- Hypixel 1.20.2+ / 1.21.x workaround ----
    // Hypixel may close the socket if it never receives modern client settings
    // during the configuration/play transition. We try a few packet names
    // because the mapping varies by protocol version.
    const sendSettingsIfNeeded = () => {
      const c = bot._client
      if (!c) return

      const settingsPayload = {
        locale: 'en_US',
        viewDistance: 10,
        chatMode: 0, // enabled
        chatColors: true,
        displayedSkinParts: 0x7f,
        mainHand: 1, // right
        enableTextFiltering: false,
        allowServerListing: true
      }

      const tryWrite = (name) => {
        try {
          c.write(name, settingsPayload)
          console.log('[MC] sent settings packet:', name)
          return true
        } catch {
          return false
        }
      }

      // Try likely names across mappings
      tryWrite('settings') ||
      tryWrite('client_settings') ||
      tryWrite('configuration_settings')
    }

    // If the client exposes "state" transitions, use them
    if (bot._client?.on) {
      bot._client.on('state', (newState) => {
        if (newState === 'configuration' || newState === 'play') {
          sendSettingsIfNeeded()
        }
      })

      // Also trigger after login success (covers some mappings)
      bot._client.on('packet', (_data, meta) => {
        if (!meta?.name) return
        if (meta.name === 'login_success' || meta.name === 'login_acknowledged') {
          sendSettingsIfNeeded()
        }
      })
    }
    // ---- end workaround ----

    return bot
  }

  onBroadcast({ username, message, replyingTo }) {
    this.app.log.broadcast(`${username}: ${message}`, 'Minecraft')

    if (this.bot?.player !== undefined) {
      this.bot.chat(`/gc ${replyingTo ? `${username} replying to ${replyingTo}:` : `${username}:`} ${message}`)
    }
  }
}

module.exports = MinecraftManager
