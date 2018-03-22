/* eslint-env jest */
jest.unmock('../subscription-dispose')

describe('subscription-dispose', () => {
  describe('Subscription.prototype.dispose', () => {
    it('should not exist', () => {
      var Subscription = require('rxjs/Subscription').Subscription
      expect(Subscription.prototype.dispose).toBeUndefined()
    })

    describe('require subscription-dispose', () => {
      const ctx = {}

      beforeEach(() => {
        ctx.Subscription = require('rxjs/Subscription').Subscription
        ctx.Subscription.prototype.unsubscribe = jest.fn()
      })

      it('should exist', () => {
        require('../subscription-dispose')
        expect(ctx.Subscription.prototype.dispose).not.toBeUndefined()
      })

      it('should unsubscribe to dispose', () => {
        require('../subscription-dispose')
        const subscription = new ctx.Subscription(() => {})
        subscription.dispose()
        expect(subscription.unsubscribe).toHaveBeenCalled()
      })
    })
  })
})
