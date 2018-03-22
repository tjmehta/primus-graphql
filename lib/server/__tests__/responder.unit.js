/* eslint-env jest */
const defaults = require('101/defaults')
const Responder = require('../responder')
const Spark = require('primus/spark')

const defaultOpts = require('../../default-opts')
const primusOpts = require('../../default-primus-opts')

// mock setup
jest.unmock('../responder')
jest.mock('primus/spark')

describe('Responder', () => {
  const ctx = {}

  beforeEach(() => {
    ctx.spark = new Spark()
    ctx.opts = defaults({
      formatError: (err) => err
    }, defaultOpts)
    ctx.primusOpts = defaults({}, primusOpts)
  })

  describe('constructor', () => {
    it('should create a Responder instance', () => {
      const responder = new Responder(ctx.spark, ctx.opts, ctx.primusOpts)
      expect(responder).toBeInstanceOf(Responder)
    })
  })

  describe('methods', () => {
    beforeEach(() => {
      ctx.responder = new Responder(ctx.spark, ctx.opts, ctx.primusOpts)
    })

    describe('send', () => {
      it('should write data to spark', () => {
        const args = {
          id: 'id',
          statusCode: 200,
          payload: {data: { foo: 'foo', bar: 'bar' }}
        }
        ctx.responder.send(args.id, args.statusCode, args.payload)
        expect(ctx.spark.write).toMatchSnapshot()
      })
    })

    describe('sendErrs', () => {
      it('should write error to spark', () => {
        const args = {
          id: 'id',
          statusCode: 400,
          errors: [new Error('boom')]
        }
        ctx.responder.sendErrs(args.id, args.statusCode, args.errors)
        expect(ctx.spark.write).toMatchSnapshot()
      })

      describe('send error', () => {
        beforeEach(() => {
          // stub responder.send
          ctx.responderSend = ctx.responder.send
          ctx.responder.send = () => {
            // unstub after first call
            ctx.responder.send = ctx.responderSend
            throw new Error('send error')
          }
        })
        afterEach(() => {
          // unstub responder.send
          ctx.responder.send = ctx.responderSend
        })

        it('should catch send error and send as error', () => {
          const args = {
            id: 'id',
            statusCode: 400,
            errors: [new Error('boom')]
          }
          ctx.responder.sendErrs(args.id, args.statusCode, args.errors)
          expect(ctx.spark.write).toMatchSnapshot()
        })
      })
    })

    describe('sendEvent', () => {
      it('should write "next" event to spark', () => {
        const args = {
          id: 'id',
          event: 'next',
          data: { foo: 'foo' }
        }
        ctx.responder.sendEvent(args.id, args.event, args.data)
        expect(ctx.spark.write).toMatchSnapshot()
      })

      it('should write "next" event w/ no data to spark', () => {
        const args = {
          id: 'id',
          event: 'next',
          data: { foo: 'foo' }
        }
        ctx.responder.sendEvent(args.id, args.event)
        expect(ctx.spark.write).toMatchSnapshot()
      })

      it('should write "completed" event to spark', () => {
        const args = {
          id: 'id',
          event: 'completed',
          data: { foo: 'foo' }
        }
        ctx.responder.sendEvent(args.id, args.event, args.data)
        expect(ctx.spark.write).toMatchSnapshot()
      })

      it('should write "error" event to spark', () => {
        const args = {
          id: 'id',
          event: 'error',
          data: new Error('boom')
        }
        ctx.responder.sendEvent(args.id, args.event, args.data)
        expect(ctx.spark.write).toMatchSnapshot()
      })

      it('should write "error" event with statusCode to spark', () => {
        const args = {
          id: 'id',
          event: 'error',
          data: defaults(new Error('boom'), { statusCode: 400 })
        }
        ctx.responder.sendEvent(args.id, args.event, args.data)
        expect(ctx.spark.write).toMatchSnapshot()
      })

      it('should write "error" event with multiple errors to spark', () => {
        const args = {
          id: 'id',
          event: 'error',
          data: { errors: [new Error('boom'), new Error('boom2')] }
        }
        ctx.responder.sendEvent(args.id, args.event, args.data)
        expect(ctx.spark.write).toMatchSnapshot()
      })
    })
  })
})
