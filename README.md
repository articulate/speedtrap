# :police_car: SpeedTrap Test

Tired of blowing 3rd party API rate limits? Does your 3rd party API keep counting requests even when it returns a 429? Does your app run in a distributed environment? Does your app have a "heavy foot"?? Then this library is for you! SpeedTrap is a tool that uses redis to keep track of your speed. Just `run()` the SpeedTrap with your function and parameters, and get a `Promise` back with your result. But watch your speed! If you go too fast, the SpeedTrap Will catch you and ticket you with a rejected `Promise`. You wont be running anywhere.

## Config options

| Name | Type   | Description | Default |
| ---- | ------ | ----------- | ------- |
| duration | Integer | the duration of the sliding window for speed calculation |  |
| letOffWithAWarning | Boolean | when `true` will allow your function to still run when the speed limit is exceeded | false |
| name | String | the unique name of your SpeedTrap used to create redis keys |  |
| onExceeded | Function | an optional function that will be called when the speed limit is exceeded | noop |
| max | Integer | the number off allowed calls per sliding duration window |  |
| redis | [redis client](https://www.npmjs.com/package/ioredis) | the redis client to be used for tracking the rate | |

## Usage

Create the SpeedTrap with your options object. Then when you are ready, call `speedTrap.run()` with your function and parameters

```js
const { SpeedTrap } = require('@articulate/speedtrap')
const RedisClient = require('ioredis')

const redisClient = new RedisClient('my-redis-url')

function onRateLimitExceeded(info) {
  const {
    waitTime // The time (ms) until a run can be made again
  } = info

  console.info(`Speed limit exceeded, must wait at least ${waitTime}ms`)
}

const config = {
  name: 'my-speed-trap',
  duration: 2000,
  max: 200,
  onExceeded: onRateLimitExceeded,
  redis: redisClient,
}

const speedTrap = new SpeedTrap(config)

function makeApiCall(param1, param2) {
  return /* a call to a crummy rate limited 3rd party marketing api */
}

speedTrap.run(myApiCall, param1, param2)
  .then(doOtherThings)
  .catch((error) => {
    if (error.isSpeedTrap) {
      // We were going too fast!! API call was not made. Maybe we sleep and retry?
      console.log(`got ticketed, gonna have to wait ${error.waitTime}ms`)
    } else {
      throw error // not from speeding...
    }
  })
```

## Let off with a warning

Want to be let off with a warning? Better hope you get a nice officer. The `letOffWithAWarning` configuration option will allow your function to continue running, but rest assured a warning will still be issued to the handler you provided for the `onExceeded` option.

## Contributing

### Prerequisites

You need to have docker installed with docker-compose. Alternatively you can set `REDIS_URL` in you `.env` to a redis instance of your choice.

### Running

First set up your `.env`

```bash
cp .env.default .env
```

run the tests

```bash
docker-compose run --rm app yarn test
```

run the tests in watch mode with

```bash
docker-compose run --rm app yarn test --watchAll
```
