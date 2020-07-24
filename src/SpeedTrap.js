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
    const results = await redis.multi()
      .zremrangebyscore(key, 0, now - duration)
      .zadd(key, now, now)
      .zrange(key, 0, -1)
      .expire(key, duration)
      .exec()

    const remaining = max - results[2].length

    if (remaining < 0) {
      await redis.zrem(key, now)
      onExceeded()

      if (!letOffWithAWarning) {
        const ticket = new Error(`Do you know how fast you were going? Speed limit of ${max}/${duration}ms exceeded`)
        ticket.isSpeedtrap = true
        return Promise.reject(ticket)
      }
    }

    return Promise
      .resolve()
      .then(() => fn(...params))
  }
}

module.exports = Speedtrap
