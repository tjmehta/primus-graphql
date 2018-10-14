/* eslint-env jest */
const EventEmitter = require('events').EventEmitter

const errorToJSON = require('error-to-json')
const defaults = require('101/defaults')

const defaultPrimusOpts = require('../../default-primus-opts')
const SubscriptionObservable = require('../subscription-observable')

jest.unmock('../subscription-observable')
jest.mock('primus')

function createStacklessErr (msg) {
  const err = new Error(msg)
  delete err.stack // avoid stacks in snapshots..
  return err
}

describe('SubscriptionObservable', () => {
  const ctx = {}

  beforeEach(() => {
    ctx.primus = new EventEmitter()
    ctx.primus.write = jest.fn()
    ctx.resEE = new EventEmitter()
    ctx.data = {}
    ctx.payload = {
      id: 'payloadId',
      query: 'query',
      variables: {
        input_0: {
          var1: 'foo'
        }
      },
      operationName: 'operationName'
    }
    ctx.primusOpts = defaults({}, defaultPrimusOpts)
    ctx.data[ctx.primusOpts.key] = ctx.payload
  })

  describe('constructor', () => {
    it('should create instance', () => {
      expect(new SubscriptionObservable(ctx.primus, ctx.resEE, ctx.data, ctx.primusOpts)).toBeInstanceOf(SubscriptionObservable)
    })
  })

  describe('methods', () => {
    beforeEach(() => {
      ctx.callbacks = {
        onNext: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn()
      }
      ctx.observable = new SubscriptionObservable(ctx.primus, ctx.resEE, ctx.data, ctx.primusOpts)
    })

    describe('subscribe', () => {
      describe('primus.write fail', () => {
        beforeEach(() => {
          ctx.primus.write.mockImplementation(() => false)
        })

        it('should not subscribe and error', () => {
          ctx.observable.subscribe(
            ctx.callbacks.onNext,
            ctx.callbacks.onError,
            ctx.callbacks.onComplete
          )
          expect(ctx.primus.write).toMatchSnapshot()
          expect(ctx.callbacks).toMatchSnapshot()
        })
      })

      describe('primus.write success', () => {
        beforeEach(() => {
          ctx.primus.write.mockImplementation(() => true)
        })

        it('should subscribe', () => {
          ctx.observable.subscribe(
            ctx.callbacks.onNext,
            ctx.callbacks.onError,
            ctx.callbacks.onComplete
          )
          expect(ctx.primus.write).toMatchSnapshot()
        })

        describe('subscribed', () => {
          beforeEach(() => {
            ctx.observable.subscribe(
              ctx.callbacks.onNext,
              ctx.callbacks.onError,
              ctx.callbacks.onComplete
            )
          })

          it('should receive next', () => {
            const eventPayload = {
              event: 'next',
              data: 'nextData'
            }
            ctx.resEE.emit(ctx.payload.id, eventPayload)
            expect(ctx.callbacks).toMatchSnapshot()
          })

          it('should receive error', () => {
            const err = new Error('boom')
            delete err.stack // avoid stacks in snapshots..
            const eventPayload = {
              event: 'error',
              errors: [errorToJSON(err)]
            }
            ctx.resEE.emit(ctx.payload.id, eventPayload)
            expect(ctx.callbacks).toMatchSnapshot()
          })

          it('should receive nested multiple errors', () => {
            const err = createStacklessErr('boom')
            err.errors = [
              errorToJSON(createStacklessErr('one')),
              errorToJSON(createStacklessErr('two'))
            ]
            const eventPayload = {
              event: 'error',
              errors: [errorToJSON(err)]
            }
            ctx.resEE.emit(ctx.payload.id, eventPayload)
            expect(ctx.callbacks).toMatchSnapshot()
          })

          it('should receive complete', () => {
            const eventPayload = {
              event: 'completed'
            }
            ctx.resEE.emit(ctx.payload.id, eventPayload)
            expect(ctx.callbacks).toMatchSnapshot()
          })

          describe('reconnect', () => {
            it('should resend subscription with reconnect var', () => {
              ctx.primus.emit('reconnected')
              expect(ctx.primus.write).toMatchSnapshot()
            })
          })
        })
      })
    })
  })
})
