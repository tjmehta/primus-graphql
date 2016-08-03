# Changelog

## v1.5.5
* Fix: subscriptions observable "next" value does not need to contain subscription name

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