/**
 * @flow
 * @relayHash 0da70aed34e742ddb81c7ee98a33bf6b
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteBatch} from 'relay-runtime';
export type UpdateUserMutationVariables = {|
  input: {
    id: string;
    name?: ?string;
    clientMutationId?: ?string;
  };
|};
export type UpdateUserMutationResponse = {|
  +updateUser: ?{|
    +user: ?{|
      +id: ?string;
      +name: ?string;
    |};
  |};
|};
*/


/*
mutation UpdateUserMutation(
  $input: UpdateUserInput!
) {
  updateUser(input: $input) {
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
        "type": "UpdateUserInput!",
        "defaultValue": null
      }
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "UpdateUserMutation",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "input",
            "variableName": "input",
            "type": "UpdateUserInput!"
          }
        ],
        "concreteType": "UpdateUserPayload",
        "name": "updateUser",
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
    "type": "Mutation"
  },
  "id": null,
  "kind": "Batch",
  "metadata": {},
  "name": "UpdateUserMutation",
  "query": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "input",
        "type": "UpdateUserInput!",
        "defaultValue": null
      }
    ],
    "kind": "Root",
    "name": "UpdateUserMutation",
    "operation": "mutation",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "input",
            "variableName": "input",
            "type": "UpdateUserInput!"
          }
        ],
        "concreteType": "UpdateUserPayload",
        "name": "updateUser",
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
  "text": "mutation UpdateUserMutation(\n  $input: UpdateUserInput!\n) {\n  updateUser(input: $input) {\n    user {\n      id\n      name\n    }\n  }\n}\n"
};

module.exports = batch;
