/* eslint-env jest */
const QueryExecutor = require('../query-executor')
const Responder = require('../responder')
const SubscribeCallbacks = require('../subscribe-callbacks')

// mock setup
jest.unmock('../subscribe-callbacks')
jest.mock('primus/spark')

describe('SubscribeCallbacks', () => {
  const ctx = {}

  beforeEach(() => {
    ctx.payload = { id: 'payloadId' }
    ctx.queryExecutor = new QueryExecutor() // mock
    ctx.responder = new Responder() // mock
  })

  describe('constructor', () => {
    it('should create a subscribe callbacks instance', () => {
      expect(new SubscribeCallbacks(ctx.payload, ctx.queryExecutor, ctx.responder)).toBeInstanceOf(SubscribeCallbacks)
    })
  })

  describe('methods', () => {
    beforeEach(() => {
      ctx.subscribeCallbacks = new SubscribeCallbacks(ctx.payload, ctx.queryExecutor, ctx.responder)
    })

    describe('onCompleted', () => {
      it('should send "completed" event', () => {
        ctx.subscribeCallbacks.onCompleted()
        expect(ctx.responder.sendEvent).toHaveBeenCalledWith(ctx.payload.id, 'completed')
      })
    })

    describe('onError', () => {
      it('should send "error" event', () => {
        const err = new Error('boom')
        ctx.subscribeCallbacks.onError(err)
        expect(ctx.responder.sendEvent).toHaveBeenCalledWith(ctx.payload.id, 'error', err)
      })
    })

    describe('onNext', () => {
      it('should send "next" event', () => {
        const next = { foo: 'foo' }
        ctx.subscribeCallbacks.onNext(next)
        expect(ctx.responder.sendEvent).toHaveBeenCalledWith(ctx.payload.id, 'next', next)
      })
    })
  })
})
