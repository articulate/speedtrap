const tinygen = require('tinygen')

const nonAlphanumeric = /[^\w\s]/gi
const spaces = /\s+/gi
function cleanName(name) {
  return name.replace(nonAlphanumeric, '').replace(spaces, '-')
}

class Speedtrap {
  constructor(config) {
    const {
      duration,
      letOffWithAWarning,
      name,
      onExceeded = Function,
      max,
      redis,
    } = config

    this.duration = duration
    this.key = `speed-trap:${cleanName(name)}`
    this.letOffWithAWarning = letOffWithAWarning
    this.max = max
    this.onExceeded = onExceeded
    this.redis = redis
  }

  async run(fn, ...params) {
    const {
      duration,
      key,
      letOffWithAWarning,
      max,
      onExceeded,
      redis,
    } = this

    const now = Date.now()
    const entry = JSON.stringify({
      id: tinygen(4),
      time: now,
    })
    const results = await redis.multi()
      .zremrangebyscore(key, 0, now - duration)
      .zadd(key, now, entry)
      .zrange(key, 0, -1)
      .expireat(key, now + duration)
      .exec()

    const timestamps = results[2][1]
    const remaining = max - timestamps.length

    if (remaining < 0) {
      await redis.zrem(key, entry)

      const waitTime = now - JSON.parse(timestamps[0]).time
      onExceeded({
        waitTime,
      })

      if (!letOffWithAWarning) {
        const ticket = new Error(`Do you know how fast you were going? Speed limit of ${max}/${duration}ms exceeded`)
        ticket.isSpeedTrap = true
        ticket.waitTime = waitTime
        return Promise.reject(ticket)
      }
    }

    return Promise
      .resolve()
      .then(() => fn(...params))
  }
}

module.exports = Speedtrap
