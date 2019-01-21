/* eslint-env jest */
const EventEmitter = require('events').EventEmitter

const createAsyncIterator = require('iterall').createAsyncIterator
const ExposedPromise = require('exposed-promise')
const last = require('101/last')
const Spark = require('primus/spark')

const activeIterators = require('../active-iterators.js')
const DataHandler = require('../data-handler')
const opts = require('../../default-opts')
const primusOpts = require('../../default-primus-opts')
const QueryExecutor = require('../query-executor')
const Responder = require('../responder.js')
const requireWithMocks = require('./__fixtures__/require-with-mocks')
const SubscribeCallbacks = require('../subscribe-callbacks.js')

// mock setup
jest.unmock('../data-handler')
jest.mock('primus/spark')

describe('DataHandler', () => {
  describe('constructor', () => {
    it('should create an instance', () => {
      const dataHandler = new DataHandler(opts, primusOpts)
      expect(dataHandler).toBeInstanceOf(DataHandler)
    })
  })

  describe('methods', () => {
    const ctx = {}

    beforeEach(() => {
      ctx.dataHandler = new DataHandler(opts, primusOpts)
      ctx.spark = new Spark()
      ctx.spark.id = 'sparkId'
    })

    it('should listen to spark', () => {
      const dataHandler = ctx.dataHandler
      const spark = ctx.spark
      dataHandler.listenToSpark(spark)
      expect(spark.on).toBeCalledWith('data', dataHandler.handleData)
      expect(spark.on).toBeCalledWith('close', dataHandler.handleClose)
    })

    describe('handleData', () => {
      beforeEach(() => {
        ctx.dataHandler.listenToSpark(ctx.spark)
      })

      it('should handle an "unsubscribe" event', () => {
        const data = {}
        const payload = data[primusOpts.key] = {
          id: 'payloadId',
          event: 'unsubscribe'
        }
        ctx.dataHandler.handleData(data)
        expect(activeIterators.unsubscribe).toHaveBeenLastCalledWith(
          ctx.spark.id,
          payload.id
        )
      })

      describe('subscription query', () => {
        beforeEach(() => {
          ctx.subscribePromise = new ExposedPromise()
          QueryExecutor.prototype.subscribe.mockImplementation(() => ctx.subscribePromise)
        })

        describe('subscribe success', () => {
          beforeEach(() => {
            ctx.iteratorVals = [{data: 1}, {data: 2}, {data: 3}]
            ctx.iterator = createAsyncIterator(ctx.iteratorVals)
            ctx.subscribePromise.resolve(ctx.iterator)
          })

          it('should handle a subscription query', () => {
            const data = {}
            const payload = data[primusOpts.key] = {
              id: 'payloadId',
              query: 'subscription {...}'
            }
            return ctx.dataHandler.handleData(data).then(() => {
              expect(activeIterators.add).toHaveBeenCalledWith(
                ctx.spark.id,
                payload.id,
                ctx.iterator
              )
              const callbacks = SubscribeCallbacks.mock.instances[0]
              expect(callbacks.onNext.mock.calls).toEqual(ctx.iteratorVals.map(val => [val.data]))
              expect(callbacks.onCompleted).toHaveBeenCalledTimes(1)
              expect(callbacks.onError).not.toHaveBeenCalled()
            })
          })

          describe('disconnect before subscribe success', () => {
            it('should not write to socket', () => {
              const data = {}
              data[primusOpts.key] = {
                id: 'payloadId',
                query: 'subscription {...}'
              }
              const handleDataPromise = ctx.dataHandler.handleData(data)
              ctx.dataHandler.stopListeningToSpark()
              const iterator = ctx.iterator
              iterator.return = jest.fn()
              return handleDataPromise.then(() => {
                expect(iterator.return).toHaveBeenCalled()
              })
            })
          })

          describe('disconnect before iterator next/completed', () => {
            it('should not write to socket', () => {
              const data = {}
              data[primusOpts.key] = {
                id: 'payloadId',
                query: 'subscription {...}'
              }
              const handleDataPromise = ctx.dataHandler.handleData(data)
              return ctx.subscribePromise.then(() => {
                ctx.dataHandler.stopListeningToSpark()
                return handleDataPromise.then(() => {
                  const callbacks = SubscribeCallbacks.mock.instances[0]
                  expect(callbacks.onError).not.toHaveBeenCalled()
                  expect(callbacks.onCompleted).not.toHaveBeenCalled()
                  expect(callbacks.onNext).not.toHaveBeenCalled()
                  expect(activeIterators.unsubscribeAll).toHaveBeenCalled()
                })
              })
            })
          })

          describe('iterator error', () => {
            beforeEach(() => {
              ctx.err = new Error('boom')
              const DataHandler2 = requireWithMocks('../data-handler', {
                'iterall': {
                  forAwaitEach: () => Promise.reject(ctx.err)
                },
                '../active-iterators': activeIterators,
                '../query-executor': QueryExecutor,
                '../subscribe-callbacks.js': SubscribeCallbacks
              })
              ctx.dataHandler = new DataHandler2(opts, primusOpts)
              ctx.dataHandler.listenToSpark(ctx.spark)
            })

            describe('disconnect before iterator error', () => {
              it('should not write to socket', () => {
                const data = {}
                data[primusOpts.key] = {
                  id: 'payloadId',
                  query: 'subscription {...}'
                }
                const handleDataPromise = ctx.dataHandler.handleData(data)
                return ctx.subscribePromise.then(() => {
                  ctx.dataHandler.stopListeningToSpark()
                  return handleDataPromise.then(() => {
                    const callbacks = SubscribeCallbacks.mock.instances[0]
                    expect(callbacks.onError).not.toHaveBeenCalled()
                    expect(callbacks.onCompleted).not.toHaveBeenCalled()
                    expect(callbacks.onNext).not.toHaveBeenCalled()
                  })
                })
              })
            })

            it('should handle an iterator that errors', () => {
              const data = {}
              const payload = data[primusOpts.key] = {
                id: 'payloadId',
                query: 'subscription {...}'
              }
              return ctx.dataHandler.handleData(data).then(() => {
                const queryExecutor = last(QueryExecutor.mock.instances)
                expect(queryExecutor.subscribe).toHaveBeenCalledWith(payload)
                expect(activeIterators.remove).toHaveBeenCalledWith(
                  ctx.spark.id,
                  payload.id
                )
                const callbacks = SubscribeCallbacks.mock.instances[0]
                expect(callbacks.onError).toHaveBeenCalledWith(ctx.err)
                expect(callbacks.onCompleted).not.toHaveBeenCalled()
                expect(callbacks.onNext).not.toHaveBeenCalled()
              })
            })
          })
        })

        describe('subscribe error', () => {
          beforeEach(() => {
            ctx.err = new Error('boom')
            ctx.subscribePromise.reject(ctx.err)
          })

          describe('disconnect before subscription error', () => {
            it('should not write to socket', () => {
              const data = {}
              data[primusOpts.key] = {
                id: 'payloadId',
                query: 'subscription {...}'
              }
              const handleDataPromise = ctx.dataHandler.handleData(data)
              ctx.dataHandler.stopListeningToSpark()
              return handleDataPromise.then(() => {
                const callbacks = SubscribeCallbacks.mock.instances[0]
                expect(callbacks.onError).not.toHaveBeenCalled()
                expect(callbacks.onCompleted).not.toHaveBeenCalled()
                expect(callbacks.onNext).not.toHaveBeenCalled()
              })
            })
          })

          it('should handle a subscription that errors', () => {
            const data = {}
            const payload = data[primusOpts.key] = {
              id: 'payloadId',
              query: 'subscription {...}'
            }
            return ctx.dataHandler.handleData(data)
              .then(() => {
                const queryExecutor = last(QueryExecutor.mock.instances)
                expect(queryExecutor.subscribe).toHaveBeenCalledWith(payload)
                expect(activeIterators.remove).toHaveBeenCalledWith(
                  ctx.spark.id,
                  payload.id
                )
                const callbacks = SubscribeCallbacks.mock.instances[0]
                expect(callbacks.onError).toHaveBeenCalledWith(ctx.err)
                expect(callbacks.onCompleted).not.toHaveBeenCalled()
                expect(callbacks.onNext).not.toHaveBeenCalled()
              })
          })
        })
      })

      describe('query query', () => {
        beforeEach(() => {
          ctx.queryPromise = new ExposedPromise()
          QueryExecutor.prototype.execute.mockImplementation(() => ctx.queryPromise)
        })

        describe('query success', () => {
          beforeEach(() => {
            ctx.resPayload = {}
            ctx.queryPromise.resolve(ctx.resPayload)
          })

          it('should handle a query query', () => {
            const data = {}
            const payload = data[primusOpts.key] = {
              id: 'payloadId',
              query: 'query {...}'
            }
            return ctx.dataHandler.handleData(data).then(() => {
              const queryExecutor = last(QueryExecutor.mock.instances)
              expect(queryExecutor.execute).toHaveBeenCalledWith(payload)
              const responder = Responder.mock.instances[0]
              expect(responder.send).toHaveBeenCalledWith(payload.id, 200, ctx.resPayload)
            })
          })

          describe('disconnect before query resolves', () => {
            it('should unsubscribe', () => {
              const data = {}
              const payload = data[primusOpts.key] = {
                id: 'payloadId',
                query: 'query {...}'
              }
              const handleDataPromise = ctx.dataHandler.handleData(data)
              ctx.dataHandler.stopListeningToSpark()
              handleDataPromise.then(() => {
                const queryExecutor = last(QueryExecutor.mock.instances)
                expect(queryExecutor.execute).toHaveBeenCalledWith(payload)
                const responder = Responder.mock.instances[0]
                expect(responder.send).not.toHaveBeenCalled()
              })
            })
          })
        })

        describe('query error', () => {
          beforeEach(() => {
            ctx.err = new Error('boom')
            ctx.err.status = 400
            ctx.queryPromise.reject(ctx.err)
          })

          it('should handle a query query', () => {
            const data = {}
            const payload = data[primusOpts.key] = {
              id: 'payloadId',
              query: 'query {...}'
            }
            return ctx.dataHandler.handleData(data).then(() => {
              const queryExecutor = last(QueryExecutor.mock.instances)
              expect(queryExecutor.execute).toHaveBeenCalledWith(payload)
              const responder = Responder.mock.instances[0]
              expect(responder.sendErrs).toHaveBeenCalledWith(
                payload.id,
                ctx.err.status,
                [ctx.err]
              )
            })
          })

          describe('disconnect before query rejects', () => {
            it('should unsubscribe', () => {
              const data = {}
              const payload = data[primusOpts.key] = {
                id: 'payloadId',
                query: 'query {...}'
              }
              const handleDataPromise = ctx.dataHandler.handleData(data)
              ctx.dataHandler.stopListeningToSpark()
              handleDataPromise.then(() => {
                const queryExecutor = last(QueryExecutor.mock.instances)
                expect(queryExecutor.execute).toHaveBeenCalledWith(payload)
                const responder = Responder.mock.instances[0]
                expect(responder.send).not.toHaveBeenCalled()
              })
            })
          })
        })
      })

      describe('invalid/ignored payloads', () => {
        beforeEach(() => {
          ctx.debug = jest.fn()
          const DataHandler2 = requireWithMocks('../data-handler', {
            'debug': () => ctx.debug,
            '../responder.js': Responder
          })
          ctx.dataHandler = new DataHandler2(opts, primusOpts)
          ctx.dataHandler.listenToSpark(ctx.spark)
        })

        it('should ignore payload if it is missing the key', () => {
          const data = {}
          ctx.dataHandler.handleData(data)
          expect(ctx.debug).toHaveBeenLastCalledWith(
            expect.stringMatching(/ignore payload/),
            data[primusOpts.key]
          )
        })

        it('should ignore payload if it is missing id', () => {
          const data = {}
          const payload = data[primusOpts.key] = {}
          ctx.dataHandler.handleData(data)
          expect(ctx.debug).toHaveBeenLastCalledWith(
            expect.stringMatching(/invalid payload.*id/),
            payload
          )
        })

        it('should ignore payload if it is missing "event" and "query"', () => {
          const data = {}
          const payload = data[primusOpts.key] = { id: 'payloadId' }
          ctx.dataHandler.handleData(data)
          expect(ctx.debug).toHaveBeenLastCalledWith(
            expect.stringMatching(/invalid payload.*query and event/),
            payload
          )
        })

        it('should ignore invalid event', () => {
          const data = {}
          const payload = data[primusOpts.key] = {
            id: 'payloadId',
            event: 'foobar'
          }
          ctx.dataHandler.handleData(data)
          expect(ctx.debug).toHaveBeenLastCalledWith(
            expect.stringMatching(/invalid event payload/),
            payload
          )
        })

        it('should respond error for an invalid query', () => {
          const data = {}
          const payload = data[primusOpts.key] = {
            id: 'payloadId',
            query: {}
          }
          ctx.dataHandler.handleData(data)
          expect(ctx.debug).toHaveBeenLastCalledWith(
            expect.stringMatching(/query must be a string/)
          )
          const responder = last(Responder.mock.instances)
          expect(responder.sendErrs).toHaveBeenCalledWith(
            payload.id,
            400,
            [new Error('payload.query must be a string')]
          )
        })
      })
    })

    describe('stopListeningToSpark', () => {
      it('should do nothing if not listening', () => {
        ctx.dataHandler.stopListeningToSpark()
        expect(ctx.spark.removeListener).not.toHaveBeenCalled()
        expect(ctx.spark.removeListener).not.toHaveBeenCalled()
      })

      describe('listening to spark', () => {
        beforeEach(() => {
          ctx.dataHandler.listenToSpark(ctx.spark)
        })

        it('should stop listening to spark events', () => {
          ctx.dataHandler.stopListeningToSpark()
          expect(ctx.spark.removeListener).toHaveBeenCalledWith(
            'data',
            ctx.dataHandler.handleData
          )
          expect(ctx.spark.removeListener).toHaveBeenCalledWith(
            'close',
            ctx.dataHandler.handleClose
          )
          expect(activeIterators.unsubscribeAll).toHaveBeenCalled()
        })
      })
    })

    describe('close event', () => {
      beforeEach(() => {
        ctx.spark = new EventEmitter()
        ctx.dataHandler.listenToSpark(ctx.spark)
      })

      it('should unsubscribeAll', () => {
        ctx.spark.emit('close')
        expect(activeIterators.unsubscribeAll).toHaveBeenCalledWith(ctx.spark.id)
      })
    })
  })
})
