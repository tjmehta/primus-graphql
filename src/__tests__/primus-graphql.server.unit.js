/* eslint-env jest */
const DataHandler = require('../server/data-handler')
const EventEmitter = require('events').EventEmitter
const defaults = require('101/defaults')
const GraphQL = require('graphql')

const createServerPlugin = require('../primus-graphql.server')
const defaultPrimusOpts = require('../default-primus-opts')

jest.unmock('../primus-graphql.server')

describe('createServerPlugin', () => {
  const ctx = {}

  beforeEach(() => {
    const userResolve = jest.fn()
    const schema = new GraphQL.GraphQLSchema({
      query: new GraphQL.GraphQLObjectType({
        name: 'RootQuery',
        fields: {
          user: {
            type: new GraphQL.GraphQLObjectType({
              name: 'User',
              fields: {
                id: {
                  type: GraphQL.GraphQLString
                },
                name: {
                  type: GraphQL.GraphQLString
                }
              }
            }),
            args: {},
            resolve: userResolve
          }
        }
      })
    })
    ctx.opts = { schema: schema }
  })

  it('should return serverPlugin', () => {
    const serverPlugin = createServerPlugin(ctx.opts)
    expect(serverPlugin).toEqual(expect.any(Function))
  })

  describe('serverPlugin', () => {
    beforeEach(() => {
      ctx.serverPlugin = createServerPlugin(ctx.opts)
      ctx.primus = new EventEmitter()
      ctx.primus.on = jest.fn(ctx.primus.on)
      ctx.primus.emit = jest.fn(ctx.primus.emit)
      ctx.primus.Spark = function Spark () {}
      ctx.primusOpts = defaults({}, defaultPrimusOpts)
    })

    it('should extend Spark', () => {
      ctx.serverPlugin(ctx.primus, ctx.primusOpts)
      expect(ctx.primus.Spark.prototype.attachGraphQLDataHandler).toEqual(expect.any(Function))
      expect(ctx.primus.Spark.prototype.detachGraphQLDataHandler).toEqual(expect.any(Function))
    })

    it('should extend primus', () => {
      ctx.serverPlugin(ctx.primus, ctx.primusOpts)
      expect(ctx.primus.graphql).toEqual(expect.any(Function))
    })

    describe('spark methods', () => {
      beforeEach(() => {
        ctx.serverPlugin(ctx.primus, ctx.primusOpts)
        ctx.spark = new ctx.primus.Spark()
      })

      describe('attachGraphQLDataHandler', () => {
        it('should attach dataHandler to spark', () => {
          ctx.spark.attachGraphQLDataHandler()
          expect(DataHandler).toHaveBeenCalledWith(ctx.opts, ctx.primusOpts)
          const dataHandler = DataHandler.mock.instances[0]
          expect(dataHandler.listenToSpark).toHaveBeenCalledWith(ctx.spark)
          expect(dataHandler.onGraphQLError).toHaveBeenCalledWith(expect.any(Function))
          const handleGraphQLError = dataHandler.onGraphQLError.mock.calls[0][0]
          const graphqlErr = new Error('boom')
          const graphqlPayload = {}
          handleGraphQLError(graphqlErr, graphqlPayload)
          expect(ctx.primus.emit).toHaveBeenCalledWith('graphql:error', ctx.spark, graphqlErr, graphqlPayload)
        })

        describe('dataHandler attached to spark', () => {
          beforeEach(() => {
            ctx.spark.attachGraphQLDataHandler()
          })

          it('should do nothing', () => {
            ctx.spark.attachGraphQLDataHandler()
            expect(DataHandler).toHaveBeenCalledWith(ctx.opts, ctx.primusOpts)
            const dataHandler = DataHandler.mock.instances[0]
            expect(dataHandler.listenToSpark).toHaveBeenCalledTimes(1)
          })
        })
      })

      describe('detachGraphQLDataHandler', () => {
        it('should do nothing if already detached', () => {
          ctx.spark.detachGraphQLDataHandler()
          const dataHandler = DataHandler.mock.instances[0]
          expect(dataHandler).toBeUndefined()
        })

        describe('dataHandler attached to spark', () => {
          beforeEach(() => {
            ctx.spark.attachGraphQLDataHandler()
          })

          it('should detach dataHandler from spark', () => {
            ctx.spark.detachGraphQLDataHandler()
            const dataHandler = DataHandler.mock.instances[0]
            expect(dataHandler.stopListeningToSpark).toHaveBeenCalled()
          })
        })
      })
    })

    describe('primus.graphql', () => {
      beforeEach(() => {
        ctx.serverPlugin(ctx.primus) // no primusOpts for coverage
      })

      it('should attach primus handlers', () => {
        ctx.primus.graphql()
        expect(ctx.primus.on).toHaveBeenCalledWith('connection', expect.any(Function))
        expect(ctx.primus.on).toHaveBeenCalledWith('disconnection', expect.any(Function))
      })

      describe('primus event handler', () => {
        beforeEach(() => {
          ctx.primus.graphql()
          ctx.spark = new ctx.primus.Spark()
          ctx.spark.attachGraphQLDataHandler = jest.fn()
          ctx.spark.detachGraphQLDataHandler = jest.fn()
        })

        it('should call spark.attachGraphQLDataHandler for each "connection"', () => {
          ctx.primus.emit('connection', ctx.spark)
          expect(ctx.spark.attachGraphQLDataHandler).toHaveBeenCalled()
        })

        it('should call spark.attachGraphQLDataHandler for each "disconnection"', () => {
          ctx.primus.emit('disconnection', ctx.spark)
          expect(ctx.spark.detachGraphQLDataHandler).toHaveBeenCalled()
        })
      })
    })
  })
})
