/* eslint-env jest */
const defaults = require('101/defaults')
const EventEmitter = require('events').EventEmitter
const parseErr = require('error-to-json').parse
const shimmer = require('shimmer')
const uuid = require('uuid')

const defaultPrimusOpts = require('../default-primus-opts')
const SubscriptionObservable = require('../client/subscription-observable')

jest.unmock('../primus-graphql.client')

function getReqId (reqData) {
  return reqData[defaultPrimusOpts.key].id
}

describe('primus-graphql client', () => {
  const ctx = {}

  beforeEach(function () {
    // setup globals
    ctx.primus = global.primus = this.primus = new EventEmitter()
    global.primus.on = jest.fn(this.primus.on)
    global.primus.write = jest.fn()
    ctx.primusOpts = global.primusOpts = defaults({}, defaultPrimusOpts)
    // require client
    ctx.client = require('../primus-graphql.client')
  })
  afterEach(function () {
    delete global.primus
    delete global.primusOpts
  })

  describe('graphql', () => {
    beforeEach(() => {
      ctx.query = 'query'
      ctx.vars = { var1: 'var1' }
      ctx.files = []
      ctx.operationName = 'operationName'
      shimmer.wrap(uuid, 'v4', () => jest.fn(() => ctx.payloadId))
    })
    afterEach(() => {
      shimmer.unwrap(uuid, 'v4')
    })

    describe('write fail', () => {
      beforeEach(() => {
        global.primus.write.mockImplementation(() => false)
      })

      it('should make a graphql query', () => {
        const promise = global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName)
        const reqData = {}
        reqData[ctx.primusOpts.key] = {
          id: expect.any(String),
          query: ctx.query,
          variables: ctx.vars,
          operationName: ctx.operationName,
          files: ctx.files
        }
        expect(ctx.primus.write).toHaveBeenCalledWith(reqData)
        return promise.then(() => {
          throw new Error('this should not happen')
        }).catch((err) => {
          expect(err.message).toMatch(/write failed/)
        })
      })
    })

    describe('write success', () => {
      beforeEach(() => {
        global.primus.write.mockImplementation(() => true)
      })

      it('should not attach primus "data" listener twice', () => {
        global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName)
        global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName)
        expect(global.primus.listeners('data')).toHaveLength(1)
      })

      it('should make a graphql query - all args', () => {
        global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName)
        const reqData = {}
        reqData[ctx.primusOpts.key] = {
          id: expect.any(String),
          query: ctx.query,
          variables: ctx.vars,
          operationName: ctx.operationName,
          files: ctx.files
        }
        expect(ctx.primus.write).toHaveBeenCalledWith(reqData)
      })

      describe('arg defaults w/ callback', () => {
        beforeEach(() => {
          ctx.cb = () => {}
        })

        it('should make a graphql query - query', () => {
          global.primus.graphql(ctx.query, ctx.cb)
          const reqData = {}
          reqData[ctx.primusOpts.key] = {
            id: expect.any(String),
            query: ctx.query
          }
          expect(ctx.primus.write).toHaveBeenCalledWith(reqData)
        })

        it('should make a graphql query - query, vars', () => {
          global.primus.graphql(ctx.query, ctx.vars, ctx.cb)
          const reqData = {}
          reqData[ctx.primusOpts.key] = {
            id: expect.any(String),
            query: ctx.query,
            variables: ctx.vars
          }
          expect(ctx.primus.write).toHaveBeenCalledWith(reqData)
        })

        it('should make a graphql query - query, vars, files', () => {
          global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.cb)
          const reqData = {}
          reqData[ctx.primusOpts.key] = {
            id: expect.any(String),
            query: ctx.query,
            variables: ctx.vars,
            files: ctx.files
          }
          expect(ctx.primus.write).toHaveBeenCalledWith(reqData)
        })

        it('should make a graphql query - query, vars, files, operationName', () => {
          global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName, ctx.cb)
          const reqData = {}
          reqData[ctx.primusOpts.key] = {
            id: expect.any(String),
            query: ctx.query,
            variables: ctx.vars,
            files: ctx.files,
            operationName: ctx.operationName
          }
          expect(ctx.primus.write).toHaveBeenCalledWith(reqData)
        })

        it('should make a graphql query - query, vars, files, operationName', () => {
          global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName)
          const reqData = {}
          reqData[ctx.primusOpts.key] = {
            id: expect.any(String),
            query: ctx.query,
            variables: ctx.vars,
            files: ctx.files,
            operationName: ctx.operationName
          }
          expect(ctx.primus.write).toHaveBeenCalledWith(reqData)
        })
      })

      describe('graphql query', () => {
        beforeEach(() => {
          ctx.promise = global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName)
          ctx.reqPayload = {
            id: getReqId(ctx.primus.write.mock.calls[0][0]),
            query: ctx.query,
            variables: ctx.vars,
            operationName: ctx.operationName,
            files: ctx.files
          }
          ctx.reqData = {}
          ctx.reqData[ctx.primusOpts.key] = ctx.reqPayload
        })

        describe('ignore unrelated primus data', () => {
          beforeEach(() => {
            ctx.primus.emit('data', { foo: 'foo' })
          })

          it('should yield response payload', (done) => {
            ctx.promise.then(() => {
              done(new Error('this should not happen'))
            }).catch(done)
            setTimeout(() => {
              done()
            }, 0)
          })
        })

        describe('successful response', () => {
          beforeEach(() => {
            ctx.resPayload = {
              id: ctx.reqPayload.id,
              data1: 'data1'
            }
            ctx.resData = {}
            ctx.resData[global.primusOpts.key] = ctx.resPayload
            ctx.primus.emit('data', ctx.resData)
          })

          it('should yield response payload', () => {
            return ctx.promise.then((resPayload) => {
              expect(resPayload).toEqual(ctx.resPayload)
            })
          })
        })

        describe('error response', () => {
          beforeEach(() => {
            ctx.resPayload = {
              id: ctx.reqPayload.id,
              errors: [{messag: 'boom'}]
            }
            ctx.resData = {}
            ctx.resData[global.primusOpts.key] = ctx.resPayload
            ctx.primus.emit('data', ctx.resData)
          })

          it('should recieve', () => {
            return ctx.promise.then((resPayload) => {
              const expectedPayload = {
                id: ctx.resPayload.id,
                errors: ctx.resPayload.errors.map(parseErr)
              }
              expect(resPayload).toEqual(expectedPayload)
            })
          })
        })
      })

      describe('graphql subscription', () => {
        beforeEach(() => {
          global.primus.write.mockImplementation(() => true)
          ctx.query = 'subscription { ... }'
        })

        it('should make a graphql subscription', () => {
          global.primus.graphql(ctx.query, ctx.vars, ctx.files, ctx.operationName)
          const reqData = {}
          reqData[ctx.primusOpts.key] = {
            id: expect.any(String),
            query: ctx.query,
            variables: ctx.vars,
            operationName: ctx.operationName,
            files: ctx.files
          }
          expect(SubscriptionObservable).toMatchSnapshot()
        })
      })
    })
  })
})
