
const forAwaitEach = require('iterall').forAwaitEach

const db = require('./__fixtures__/mem-db')
const UserIterator = require('./__fixtures__/user-changes-iterator')

describe('UserChangesIterator', () => {
  let user

  beforeEach(() => {
    db.reset()
    user = db.createUser({
      name: 'user0name0'
    })
  })

  it('should emit user changes', () => {
    const userUpdates = [
      { name: 'user0name1' },
      { name: 'user0name2' },
      { name: 'user0name3' },
    ]
    const iterator = new UserIterator(user.id)
    const nextSpy = jest.fn()

    return Promise.all([
      forAwaitEach(iterator, nextSpy),
      Promise.resolve().then(() => {
        userUpdates.forEach((update) => {
          db.updateUser(user.id, update)
        })
        iterator.return()
      })
    ]).then(() => {
      const vals = nextSpy.mock.calls.map((args) => {
        return args[0]
      })
      const expectedVals = [{ user: user }].concat(userUpdates.map((update) => {
        return { user: Object.assign({}, user, update) }
      }))
      expect(vals).toEqual(expectedVals)
    })
  })
})
