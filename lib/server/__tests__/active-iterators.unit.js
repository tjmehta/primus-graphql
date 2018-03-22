/* eslint-env jest */
const activeIterators = require('../active-iterators')
const CounterIterator = require('./__fixtures__/counter-iterator')

// mock setup
jest.unmock('../active-iterators')

describe('activeIterators', () => {
  const connId = 'connId'
  const payloadId = 'payloadId'

  describe('add', () => {
    it('should add an iterator', () => {
      const iterator = new CounterIterator(5)
      activeIterators.add(connId, payloadId, iterator)
      expect(activeIterators._get(connId)[payloadId]).toEqual(iterator)
    })

    it('should error for non-iterator', () => {
      expect(() =>
        activeIterators.add(connId, payloadId, {})
      ).toThrow(/must be an.*iterable/)
    })
  })

  describe('remove', () => {
    it('should remove nothing if iterator DNE', function () {
      activeIterators.remove(connId, payloadId)
      expect(activeIterators._get(connId)[payloadId]).toBeUndefined()
    })

    describe('iterator exists', () => {
      beforeEach(() => {
        const iterator = new CounterIterator(5)
        activeIterators.add(connId, payloadId, iterator)
      })

      it('should remove the iterator', () => {
        activeIterators.remove(connId, payloadId)
        expect(activeIterators._get(connId)[payloadId]).toBeUndefined()
      })
    })
  })

  describe('unsubscribe', () => {
    const remove = activeIterators.remove
    beforeEach(() => {
      activeIterators.remove = jest.fn(activeIterators.remove)
    })
    afterEach(() => {
      activeIterators.remove = remove
    })

    it('should do nothing if iterator DNE', function () {
      activeIterators.unsubscribe(connId, payloadId)
      expect(activeIterators.remove).not.toHaveBeenCalled()
    })

    describe('iterator exists', () => {
      let iterator
      beforeEach(() => {
        iterator = new CounterIterator(5)
        iterator.return = jest.fn(iterator.return)
        activeIterators.add(connId, payloadId, iterator)
      })

      it('should stop and remove the iterator', () => {
        activeIterators.unsubscribe(connId, payloadId)
        expect(activeIterators._get(connId)[payloadId]).toBeUndefined()
        expect(iterator.return).toHaveBeenCalled()
        expect(activeIterators.remove).toHaveBeenCalledWith(connId, payloadId)
      })
    })
  })

  describe('unsubscribeAll', () => {
    const unsubscribe = activeIterators.unsubscribe
    const payloadId2 = 'payloadId2'
    beforeEach(() => {
      activeIterators.unsubscribe = jest.fn(activeIterators.unsubscribe)
    })
    afterEach(() => {
      activeIterators.unsubscribe = unsubscribe
    })

    it('should do nothing if no active iterators', function () {
      activeIterators.unsubscribeAll(connId)
      expect(activeIterators.unsubscribe).not.toHaveBeenCalled()
    })

    describe('active iterators exists', () => {
      let iterator
      let iterator2
      beforeEach(() => {
        iterator = new CounterIterator(5)
        iterator2 = new CounterIterator(5)
        activeIterators.add(connId, payloadId, iterator)
        activeIterators.add(connId, payloadId2, iterator2)
      })

      it('should remove the iterator', () => {
        activeIterators.unsubscribeAll(connId)
        expect(activeIterators.unsubscribe).toHaveBeenCalledWith(connId, payloadId)
        expect(activeIterators.unsubscribe).toHaveBeenCalledWith(connId, payloadId2)
      })
    })
  })
})
