# Changelog

## 2.0.3
* Fix: backwards compatibility with primus-graphql relay-classic network-layer

## 2.0.2
* Fix: travis tests

## 2.0.1
* Fix: update package-lock.json

## 2.0.0
* Breaking: client was rewritten to work with relay-modern
* Breaking: remove reconnect input field on subscriptions
* Feature: server now uses official graphql subscriptions

## v1.6.6
* Fix: travis-ci tests...

## v1.6.5
* Fix: subscription `resolve`s should share execution variables w/ root `observe`
* Fix: client timeout errors resulted in non-array `err.errors`

## v1.6.4
* Fix: remove subscription from active-subscriptions onCompleted/onError

## v1.6.3
* Improvement: moved "subscribe callbacks onNext graphql-execute mapping" for subscription to query-executor.

## v1.6.2
* Fix: query-executor changes not published (not built)

## v1.6.1
* Fix: handle edgecase where uncaught (by promise) runtime errors in query "resolve" (and subscription "observe") would be set as `data.data`

## v1.6.0
* Feature: auto-setup primus-graphql with primus.use
* Feature: added `primus.graphql()` to attach connection/disconnection handlers
* Fix: fixed potential active-subscription memory leak
* Fix: standard lint

## v1.5.5
* Fix: subscriptions observable "next" value does not need to contain subscription name
* Fix: e2e tests improvements, more robust subscription tests.

## v1.5.4
* Fix: default primus-graphql data-payload-key to be "primus-graphql"

## v1.5.3
* Fix: improved warning messages for retries
* Fix: remove graphql from peer deps, as it is optional.

## v1.5.2
* Fix: remove react-relay from peer deps, as it is optional.

## v1.5.1
* Fix: improved error messages on client side
* Fix: fixed edgecase where error payload would have a 200 status code

## v1.5.0
* Features: `subscriptions.observe` now recieves `context` and `info` just like `mutation.mutateAndGetPayload`

## v1.4.0
* Feature: GraphQL Relay Subscription observe - added support for promises (that resolve observables)

## v1.3.0
* Feature: Added support for relay subscriptions
* Fix: OOP cleanup

## v1.2.0
* Feature: Improved browser bundling, removed relay-network-layer from index.

## v1.1.1
* Fix: Add keywords in package.json, for easier discovery

## v1.1.0
* Feature: Add relay support via relay-network-layer

## v1.0.0
* Initial implementation
* Supports similar to express-graphql
