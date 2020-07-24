const Redis = require('ioredis')
const Speedtrap = require('../src/SpeedTrap')

const { REDIS_URL } = require('./support/env')

describe('Speedtrap', () => {
  let redis, speedTrap

  beforeAll(() => {
    redis = new Redis(REDIS_URL)
  })

  beforeEach(() => {
    speedTrap = new Speedtrap()
  })

  describe('gets ticketed', () => {

  })
})
