/**
 * @flow
 * @relayHash 7b8900d3ce167d54e74de6cbf1f22283
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteBatch} from 'relay-runtime';
export type UserSubscriptionVariables = {|
  input: {
    id: string;
    clientSubscriptionId?: ?string;
  };
|};
export type UserSubscriptionResponse = {|
  +userChanges: ?{|
    +user: ?{|
      +id: ?string;
      +name: ?string;
    |};
  |};
|};
*/


/*
subscription UserSubscription(
  $input: UserChangesInput!
) {
  userChanges(input: $input) {
    user {
      id
      name
    }
  }
}
*/

const batch /*: ConcreteBatch*/ = {
  "fragment": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "input",
        "type": "UserChangesInput!",
        "defaultValue": null
      }
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "UserSubscription",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "input",
            "variableName": "input",
            "type": "UserChangesInput!"
          }
        ],
        "concreteType": "UserChangesPayload",
        "name": "userChanges",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "args": null,
            "concreteType": "User",
            "name": "user",
            "plural": false,
            "selections": [
              {
                "kind": "ScalarField",
                "alias": null,
                "args": null,
                "name": "id",
                "storageKey": null
              },
              {
                "kind": "ScalarField",
                "alias": null,
                "args": null,
                "name": "name",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Subscription"
  },
  "id": null,
  "kind": "Batch",
  "metadata": {},
  "name": "UserSubscription",
  "query": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "input",
        "type": "UserChangesInput!",
        "defaultValue": null
      }
    ],
    "kind": "Root",
    "name": "UserSubscription",
    "operation": "subscription",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "input",
            "variableName": "input",
            "type": "UserChangesInput!"
          }
        ],
        "concreteType": "UserChangesPayload",
        "name": "userChanges",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "args": null,
            "concreteType": "User",
            "name": "user",
            "plural": false,
            "selections": [
              {
                "kind": "ScalarField",
                "alias": null,
                "args": null,
                "name": "id",
                "storageKey": null
              },
              {
                "kind": "ScalarField",
                "alias": null,
                "args": null,
                "name": "name",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "text": "subscription UserSubscription(\n  $input: UserChangesInput!\n) {\n  userChanges(input: $input) {\n    user {\n      id\n      name\n    }\n  }\n}\n"
};

module.exports = batch;
