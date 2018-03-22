/**
 * @flow
 * @relayHash 8a8b0d5049f8a1fbdf528290a0343f99
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteBatch} from 'relay-runtime';
export type getRootContainerQueryResponse = {|
  +user: ?{| |};
|};
*/


/*
query getRootContainerQuery(
  $userId: String
) {
  user(id: $userId) {
    ...UserContainer_user
  }
}

fragment UserContainer_user on User {
  id
  name
  ...UpdateUserMutation_user
  ...UserSubscription_user
}

fragment UpdateUserMutation_user on User {
  id
}

fragment UserSubscription_user on User {
  id
}
*/

const batch /*: ConcreteBatch*/ = {
  "fragment": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "userId",
        "type": "String",
        "defaultValue": null
      }
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "getRootContainerQuery",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "id",
            "variableName": "userId",
            "type": "String"
          }
        ],
        "concreteType": "User",
        "name": "user",
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "UserContainer_user",
            "args": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query"
  },
  "id": null,
  "kind": "Batch",
  "metadata": {},
  "name": "getRootContainerQuery",
  "query": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "userId",
        "type": "String",
        "defaultValue": null
      }
    ],
    "kind": "Root",
    "name": "getRootContainerQuery",
    "operation": "query",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "id",
            "variableName": "userId",
            "type": "String"
          }
        ],
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
    ]
  },
  "text": "query getRootContainerQuery(\n  $userId: String\n) {\n  user(id: $userId) {\n    ...UserContainer_user\n  }\n}\n\nfragment UserContainer_user on User {\n  id\n  name\n  ...UpdateUserMutation_user\n  ...UserSubscription_user\n}\n\nfragment UpdateUserMutation_user on User {\n  id\n}\n\nfragment UserSubscription_user on User {\n  id\n}\n"
};

module.exports = batch;
