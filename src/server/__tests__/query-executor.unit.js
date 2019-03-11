/* eslint-env jest */
const defaults = require('101/defaults')
const EventEmitter = require('events').EventEmitter
const isAsyncIterable = require('iterall').isAsyncIterable
const Spark = require('primus/spark')

const createRootSchema = require('./__fixtures__/schema/create-root-schema')
const defaultOpts = require('../../default-opts')
const EventIterator = require('./__fixtures__/ee-iterator')
const primusOpts = require('../../default-primus-opts')
const QueryExecutor = require('../query-executor')

// mock setup
jest.unmock('../query-executor')
jest.mock('primus/spark')

describe('QueryExecutor', () => {
  let spark
  let opts
  const userResolve = jest.fn()
  const schema = createRootSchema({ user: userResolve })

  beforeEach(() => {
    spark = new Spark()
    opts = defaults({
      schema: schema,
      context: {},
      rootValue: {}
    }, defaultOpts)
  })

  describe('constructor', () => {
    it('should error if opts.schema is missing', () => {
      delete opts.schema
      expect(() => new QueryExecutor(spark, opts, primusOpts)).toThrow(/schema.*required/)
    })

    it('should create a QueryExecutor instance', () => {
      const queryExecutor = new QueryExecutor(spark, opts, primusOpts)
      expect(queryExecutor).toBeInstanceOf(QueryExecutor)
    })
  })

  describe('statics', () => {
    describe('parseQuery', () => {
      it('should parse a valid query', () => {
        expect(QueryExecutor.parseQuery('query UserQuery { user { id } }')).toMatchSnapshot()
      })

      it('should throw an error for an invalid query', () => {
        try {
          QueryExecutor.parseQuery('query invalid')
        } catch (err) {
          expect(err).toMatchSnapshot()
        }
      })
    })
  })

  describe('methods', () => {
    let queryExecutor

    beforeEach(() => {
      queryExecutor = new QueryExecutor(spark, opts, primusOpts)
    })

    describe('execute', () => {
      describe('validation errors', () => {
        it('should yield validation error', () => {
          const payload = {
            query: 'query UnsupportedQuery { yolo { id } }',
            variables: {}
          }
          return queryExecutor.execute(payload).then(() => {
            throw new Error('this should not happen')
          }).catch((err) => {
            expect({
              message: err.message,
              status: err.status,
              errors: err.errors
            }).toMatchSnapshot()
          })
        })
      })

      describe('user yields user', () => {
        const mockUser = {
          id: 'id',
          name: 'name'
        }
        beforeEach(() => {
          userResolve.mockImplementation(() => mockUser)
        })

        it('should execute user query', () => {
          const payload = {
            query: 'query UserQuery { user { id } }',
            variables: {}
          }
          return queryExecutor.execute(payload).then((result) => {
            expect(result.data.user).toEqual({ id: mockUser.id })
          })
        })
      })

      describe('user yields an error', () => {
        const err = new Error('boom')

        beforeEach(() => {
          userResolve.mockImplementation(() => (err))
        })

        it('should throw schema resolve errors', () => {
          const payload = {
            query: 'query UserQuery { user { id } }',
            variables: {}
          }
          return queryExecutor.execute(payload).then((data) => {
            console.log(data)
            throw new Error('this should not happen')
          }).catch((gqlErr) => {
            expect(gqlErr.message).toEqual(err.message)
            expect(gqlErr.name).toEqual('GraphQLError')
          })
        })
      })

      describe('payload data is error', () => {
        const err = new Error('boom')
        let queryExecutor2

        beforeEach(() => {
          jest.doMock('graphql')
          const GraphQL = require('graphql')
          GraphQL.execute.mockImplementation(() => Promise.resolve({ data: err }))
          GraphQL.validate.mockImplementation(() => [])
          const QueryExecutor2 = require('../query-executor')
          // some extra coverage here..
          queryExecutor2 = new QueryExecutor2(spark, {schema: opts.schema, context: () => 'ctx'}, primusOpts)
        })

        it('should yield error', () => {
          const payload = {
            query: 'query UserQuery { user { id } }',
            variables: {}
          }
          return queryExecutor2.execute(payload).then(() => {
            throw new Error('this should not happen')
          }).catch((_err) => {
            expect(_err).toBe(err)
          })
        })
      })

      describe('graphql.execute throws', () => {
        let err
        let queryExecutor2

        beforeEach(() => {
          err = new Error('boom')
          jest.doMock('graphql')
          const GraphQL = require('graphql')
          GraphQL.execute.mockImplementation(() => { throw err })
          GraphQL.validate.mockImplementation(() => [])
          const QueryExecutor2 = require('../query-executor')
          // some extra coverage here..
          queryExecutor2 = new QueryExecutor2(spark, {schema: opts.schema, context: () => 'ctx'}, primusOpts)
        })

        it('should yield error', () => {
          err.originalError = { status: 500 }
          const payload = {
            query: 'query UserQuery { user { id } }',
            variables: {}
          }
          return queryExecutor2.execute(payload).then(() => {
            throw new Error('this should not happen')
          }).catch((_err) => {
            expect(_err).toBe(err)
            expect(_err.status).toBe(500)
          })
        })

        it('should yield error status', () => {
          err.originalError = { statusCode: 504 }
          const payload = {
            query: 'query UserQuery { user { id } }',
            variables: {}
          }
          return queryExecutor2.execute(payload).then(() => {
            throw new Error('this should not happen')
          }).catch((_err) => {
            expect(_err).toBe(err)
            expect(_err.status).toBe(504)
          })
        })
      })

      describe('multiple errors', () => {
        const err1 = new Error('boom1')
        err1.status = 500
        const err2 = new Error('boom2')
        err2.statusCode = 504
        let queryExecutor2

        beforeEach(() => {
          jest.doMock('graphql')
          const GraphQL = require('graphql')
          GraphQL.execute.mockImplementation(() => Promise.resolve({ errors: [err1, err2] }))
          GraphQL.validate.mockImplementation(() => [])
          const QueryExecutor2 = require('../query-executor')
          queryExecutor2 = new QueryExecutor2(spark, opts, primusOpts)
        })

        it('should yield multiple validation errors', () => {
          const payload = {
            query: 'query UserQuery { user { id } }',
            variables: {}
          }
          return queryExecutor2.execute(payload).then(() => {
            throw new Error('this should not happen')
          }).catch((err) => {
            expect({
              name: err.name,
              message: err.message,
              status: err2.statusCode, // 504
              errors: err.errors
            }).toMatchSnapshot()
          })
        })
      })
    })

    describe('subscribe', () => {
      const userSubscribe = jest.fn()
      const schema2 = createRootSchema({}, {userChanges: userSubscribe})
      let queryExecutor2

      beforeEach(() => {
        queryExecutor2 = new QueryExecutor(spark, defaults({ schema: schema2 }, opts), primusOpts)
      })

      it('should throw validation error for unsupported subscription', () => {
        const payload = {
          query: 'subscription UnsupportedQuery { yolo { id } }',
          variables: {}
        }
        return queryExecutor2.subscribe(payload).then(() => {
          throw new Error('this should not happen')
        }).catch((err) => {
          expect({
            message: err.message,
            status: err.status,
            errors: err.errors
          }).toMatchSnapshot()
        })
      })

      describe('user subscribe success', () => {
        let iterator

        beforeEach(() => {
          iterator = new EventIterator(new EventEmitter())
          userSubscribe.mockImplementation(() => iterator)
        })

        it('should subscribe to userChanges subscription', () => {
          const payload = {
            query: `
              subscription UserChangesSubscription($input: UserChangesInput!) {
                userChanges(input: $input) { user { id } }
              }
            `,
            variables: {
              input: {id: 'userId'}
            }
          }
          return queryExecutor2.subscribe(payload).then((result) => {
            expect(isAsyncIterable(result)).toBe(true)
          })
        })
      })

      describe('user subscribe error', () => {
        const err = new Error('boom')
        beforeEach(() => {
          userSubscribe.mockImplementation(() => { throw err })
        })

        it('should throw subscribe error', () => {
          const payload = {
            query: `
              subscription UserChangesSubscription($input: UserChangesInput!) {
                userChanges(input: $input) { user { id } }
              }
            `,
            variables: {
              input: {id: 'userId'}
            }
          }
          return queryExecutor2.subscribe(payload).then((data) => {
            throw new Error('this should not happen')
          }).catch((gqlErr) => {
            expect(gqlErr.message).toEqual(err.message)
            expect(gqlErr.name).toEqual('GraphQLError')
          })
        })
      })
    })
  })
})
