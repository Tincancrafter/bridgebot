const EventHandler = require('../../contracts/EventHandler')

class StateHandler extends EventHandler {
  constructor(minecraft) {
    super()

    this.minecraft = minecraft

    this.loginAttempts = 0
    this.reconnectDelayMs = 60_000 // start at 60s to avoid 429
    this.reconnectTimer = null
  }

  registerEvents(bot) {
    this.bot = bot

    this.bot.on('login', () => this.onLogin())
    this.bot.on('end', (reason) => this.onEnd(reason))
    this.bot.on('kicked', (reason) => this.onKicked(reason))
  }

  onLogin() {
    this.minecraft.app.log.minecraft('Client ready, logged in as ' + this.bot.username)

    // success => reset backoff
    this.loginAttempts = 0
    this.reconnectDelayMs = 60_000

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  scheduleReconnect(context) {
    if (this.reconnectTimer) return // prevent stacking timers

    const delay = this.reconnectDelayMs
    this.minecraft.app.log.warn(
      `Minecraft bot disconnected (${context}). Attempting reconnect in ${Math.round(delay / 1000)} seconds`
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.minecraft.connect()
    }, delay)

    // backoff: 60s, 120s, 240s... up to 10 minutes
    this.reconnectDelayMs = 10 * 60_000
  }

  onEnd(reason) {
    // count all disconnects, not only kicks
    this.loginAttempts++
    this.scheduleReconnect(`end: ${reason || 'unknown'}`)
  }

  onKicked(reason) {
    this.loginAttempts++
    this.minecraft.app.log.warn(`Minecraft bot was kicked from server for "${reason}"`)
    this.scheduleReconnect('kicked')
  }
  forceCooldown(ms) {
  this.reconnectDelayMs = Math.max(this.reconnectDelayMs, ms)
}

}

module.exports = StateHandler
