const Redis = require('ioredis')
const tinygen = require('tinygen')

const Speedtrap = require('../src/SpeedTrap')
const { REDIS_URL } = require('./support/env')

function wait(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

describe('Speedtrap', () => {
  let redis, speedTrap

  const onExceeded = jest.fn()
  const mockFn = jest.fn()

  beforeAll(() => {
    redis = new Redis(REDIS_URL)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    redis.quit()
  })

  describe('gets ticketed', () => {
    beforeEach(() => {
      speedTrap = new Speedtrap({
        name: `speed-trap-test-${tinygen(8)}`,
        duration: 50,
        max: 3,
        onExceeded,
        redis,
      })
    })

    test('after exceeding the speed limit', async () => {
      try {
        await Promise.all([
          speedTrap.run(mockFn, 'a', 1),
          speedTrap.run(mockFn, 'b', 2),
          speedTrap.run(mockFn, 'c', 3),
          speedTrap.run(mockFn, 'd', 4),
        ])

        return Promise.reject('Unexpected success')
      } catch (error) {
        expect(error.isSpeedTrap).toBeTruthy()
        expect(error.waitTime).toBeTruthy()

        expect(mockFn).toHaveBeenCalledTimes(3)
        expect(mockFn).toHaveBeenCalledWith('a', 1)
        expect(mockFn).toHaveBeenCalledWith('b', 2)
        expect(mockFn).toHaveBeenCalledWith('c', 3)

        expect(onExceeded).toHaveBeenCalledTimes(1)
        expect(onExceeded.mock.calls[0][0].waitTime).toEqual(error.waitTime)
      }
    })
  })

  describe('gets let off with a warning', () => {
    beforeEach(() => {
      speedTrap = new Speedtrap({
        name: `speed-trap-test-${tinygen(8)}`,
        duration: 50,
        max: 3,
        onExceeded,
        redis,
        letOffWithAWarning: true,
      })
    })

    test('after exceeding the speed limit', async () => {
      await Promise.all([
        speedTrap.run(mockFn, 'a', 1),
        speedTrap.run(mockFn, 'b', 2),
        speedTrap.run(mockFn, 'c', 3),
        wait(5).then(() => speedTrap.run(mockFn, 'd', 4)),
        wait(5).then(() => speedTrap.run(mockFn, 'e', 5)),
      ])

      expect(mockFn).toHaveBeenCalledTimes(5)
      expect(mockFn).toHaveBeenCalledWith('a', 1)
      expect(mockFn).toHaveBeenCalledWith('b', 2)
      expect(mockFn).toHaveBeenCalledWith('c', 3)
      expect(mockFn).toHaveBeenCalledWith('d', 4)
      expect(mockFn).toHaveBeenCalledWith('e', 5)

      expect(onExceeded).toHaveBeenCalledTimes(2)
      expect(onExceeded.mock.calls[0][0].waitTime).toBeTruthy()
      expect(onExceeded.mock.calls[1][0].waitTime).toBeTruthy()
    })
  })

  describe('passes unhindered', () => {
    beforeEach(() => {
      speedTrap = new Speedtrap({
        name: `speed-trap-test-${tinygen(8)}`,
        duration: 50,
        max: 3,
        onExceeded,
        redis,
      })
    })

    test('when always respecting the speed limit', async () => {
      await Promise.all([
        speedTrap.run(mockFn, 'a', 1),
        speedTrap.run(mockFn, 'b', 2),
        speedTrap.run(mockFn, 'c', 3),
      ])
      await wait(55)
      await Promise.all([
        speedTrap.run(mockFn, 'd', 4),
        speedTrap.run(mockFn, 'e', 5),
      ])

      expect(mockFn).toHaveBeenCalledTimes(5)
      expect(mockFn).toHaveBeenCalledWith('a', 1)
      expect(mockFn).toHaveBeenCalledWith('b', 2)
      expect(mockFn).toHaveBeenCalledWith('c', 3)
      expect(mockFn).toHaveBeenCalledWith('d', 4)
      expect(mockFn).toHaveBeenCalledWith('e', 5)

      expect(onExceeded).not.toHaveBeenCalled()
    })
  })

  describe('is allowed to run again', () => {
    beforeEach(() => {
      speedTrap = new Speedtrap({
        name: `speed-trap-test-${tinygen(8)}`,
        duration: 50,
        max: 3,
        onExceeded,
        redis,
      })
    })
    test('when waiting the specified time after being ticketed', async () => {
      try {
        await Promise.all([
          speedTrap.run(mockFn, 'a', 1),
          speedTrap.run(mockFn, 'b', 2),
          speedTrap.run(mockFn, 'c', 3),
          wait(20).then(() => speedTrap.run(mockFn, 'd', 4)),
        ])
      } catch (error) {
        await wait(error.waitTime + 10)
      }
      await Promise.all([
        speedTrap.run(mockFn, 'e', 5),
      ])

      expect(mockFn).toHaveBeenCalledTimes(4)
      expect(mockFn).toHaveBeenCalledWith('a', 1)
      expect(mockFn).toHaveBeenCalledWith('b', 2)
      expect(mockFn).toHaveBeenCalledWith('c', 3)
      expect(mockFn).toHaveBeenCalledWith('e', 5)

      expect(onExceeded).toHaveBeenCalledTimes(1)
      expect(onExceeded.mock.calls[0][0].waitTime).toBeTruthy()
    })
  })
})
