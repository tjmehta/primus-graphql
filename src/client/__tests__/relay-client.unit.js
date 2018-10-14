/* eslint-env jest */
const ExposedObservable = require('static-observable')
const Primus = require('primus')
const shimmer = require('shimmer')
const Subscriber = require('rxjs').Subscriber
require('rxjs/add/operator/publish')
require('observable-backoff')

const PrimusRelayClient = require('../relay-client')

// setup mocks
jest.unmock('../relay-client')
jest.mock('primus')

describe('PrimusRelayClient', () => {
  const ctx = {}

  beforeEach(() => {
    // stub console.error for silence
    shimmer.wrap(console, 'error', () => jest.fn())
    ctx.primus = new Primus() // mock
    ctx.primus.graphql = jest.fn()
    ctx.opts = {
      retry: {
        minTimeout: 0,
        retries: 1
      }
    }
  })
  afterEach(() => {
    // unstub console.error for silence
    shimmer.unwrap(console, 'error')
  })

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(new PrimusRelayClient(ctx.primus, ctx.opts)).toBeInstanceOf(PrimusRelayClient)
    })
  })

  describe('methods', () => {
    beforeEach(() => {
      ctx.relayClient = new PrimusRelayClient(ctx.primus, ctx.opts)
    })

    describe('fetch', () => {
      describe('graphql success (200)', () => {
        beforeEach(() => {
          ctx.payload = {
            statusCode: 200
          }
          ctx.primus.graphql.mockImplementation(() => Promise.resolve(ctx.payload))
        })

        it('should send graphql query', () => {
          const operation = { text: 'operationText' }
          const variables = { var1: 'foo', var2: 'bar' }
          return ctx.relayClient.fetch(operation, variables).then((payload) => {
            expect(ctx.primus.graphql).toMatchSnapshot()
            expect(payload).toBe(ctx.payload)
          })
        })
      })

      describe('graphql non-retryable error (400)', () => {
        beforeEach(() => {
          ctx.payload = {
            statusCode: 400
          }
          ctx.primus.graphql.mockImplementation(() => Promise.resolve(ctx.payload))
        })

        it('should send graphql query', () => {
          const operation = { text: 'operationText' }
          const variables = { var1: 'foo', var2: 'bar' }
          return ctx.relayClient.fetch(operation, variables).then(() => {
            throw new Error('this should not happen')
          }).catch((err) => {
            expect(err).toMatchSnapshot()
          })
        })
      })

      describe('graphql retryable error (500)', () => {
        beforeEach(() => {
          ctx.payload = {
            statusCode: 500
          }
          ctx.primus.graphql.mockImplementation(() => Promise.resolve(ctx.payload))
        })

        it('should send graphql query', () => {
          const operation = { text: 'operationText' }
          const variables = { var1: 'foo', var2: 'bar' }
          return ctx.relayClient.fetch(operation, variables).then(() => {
            throw new Error('this should not happen')
          }).catch((err) => {
            expect(err).toMatchSnapshot()
          })
        })
      })

      describe('timeout error', () => {
        beforeEach(() => {
          ctx.opts = {
            timeout: 0,
            retry: {
              minTimeout: 0,
              retries: 0
            }
          }
          ctx.relayClient = new PrimusRelayClient(ctx.primus, ctx.opts)
          ctx.primus.graphql.mockImplementation(() => new Promise(() => {}))
        })

        it('should yield timeout error', () => {
          const operation = { text: 'operationText' }
          const variables = { var1: 'foo', var2: 'bar' }
          // fetch
          const promise = ctx.relayClient.fetch(operation, variables)
          // assertions
          return promise.then(() => {
            throw new Error('this should not happen')
          }).catch((err) => {
            expect(err).toMatchSnapshot()
          })
        })

        describe('1 retry', () => {
          beforeEach(() => {
            ctx.opts.retry.retries = 1
            ctx.relayClient = new PrimusRelayClient(ctx.primus, ctx.opts)
            ctx.primus.graphql.mockImplementation(() => new Promise(() => {}))
          })
          it('should yield timeout error', () => {
            const operation = { text: 'operationText' }
            const variables = { var1: 'foo', var2: 'bar' }
            // fetch
            const promise = ctx.relayClient.fetch(operation, variables)
            // assertions
            return promise.then(() => {
              throw new Error('this should not happen')
            }).catch((err) => {
              expect(err).toMatchSnapshot()
            })
          })
        })
      })
    })

    describe('subscribe', () => {
      beforeEach(() => {
        ctx.observable = new ExposedObservable()
        ctx.primus.graphql.mockImplementation(() => ctx.observable)
        ctx.observer = {
          onCompleted: jest.fn(),
          onError: jest.fn(),
          onNext: jest.fn()
        }
      })

      it('should subscribe to graphql subscription', () => {
        const operation = { text: 'operationText' }
        const variables = { var1: 'foo', var2: 'bar' }
        const cacheConfig = null
        const subscriber = ctx.relayClient.subscribe(operation, variables, cacheConfig, ctx.observer)
        expect(subscriber).toBeInstanceOf(Subscriber)
        expect(subscriber.unsubscribe).toEqual(expect.any(Function))
      })

      it('should subscribe to subscription and retry on error (short error)', (done) => {
        const operation = { text: 'operationText' }
        const variables = { var1: 'foo', var2: 'bar' }
        const cacheConfig = null
        ctx.relayClient.subscribe(operation, variables, cacheConfig, ctx.observer)
        // short error w/ no stack for coverage
        const err = new Error('')
        delete err.stack
        ctx.observable.error(err)
        setTimeout(() => {
          expect(ctx.observer).toMatchSnapshot()
          done()
        }, 100)
      })

      it('should subscribe to subscription and retry on error (long error)', (done) => {
        const operation = { text: 'operationText' }
        const variables = { var1: 'foo', var2: 'bar' }
        const cacheConfig = null
        ctx.relayClient.subscribe(operation, variables, cacheConfig, ctx.observer)
        // long error w/ no stack for coverage
        const err = new Error('long message')
        delete err.stack
        ctx.observable.error(err)
        setTimeout(() => {
          expect(ctx.observer).toMatchSnapshot()
          done()
        }, 100)
      })

      describe('subscribed', () => {
        beforeEach(() => {
          ctx.operation = { text: 'operationText' }
          ctx.variables = { var1: 'foo', var2: 'bar' }
          ctx.cacheConfig = null
          ctx.subscriber = ctx.relayClient.subscribe(ctx.operation, ctx.variables, ctx.cacheConfig, ctx.observer)
        })

        it('should recieve next', (done) => {
          const nextData = 'nextData'
          ctx.observable.next(nextData)
          setTimeout(() => {
            expect(ctx.observer).toMatchSnapshot()
            done()
          }, 100)
        })
      })
    })
  })
})
