/**
 * @flow
 * @relayHash 941f4718b978e40dbf02a9f68f72d02b
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type UserChangesInput = {
  id: string,
  clientSubscriptionId?: ?string,
};
export type UserSubscriptionVariables = {|
  input: UserChangesInput
|};
export type UserSubscriptionResponse = {|
  +userChanges: ?{|
    +user: ?{|
      +id: string,
      +name: ?string,
    |}
  |}
|};
export type UserSubscription = {|
  variables: UserSubscriptionVariables,
  response: UserSubscriptionResponse,
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

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "input",
    "type": "UserChangesInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "LinkedField",
    "alias": null,
    "name": "userChanges",
    "storageKey": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input",
        "type": "UserChangesInput!"
      }
    ],
    "concreteType": "UserChangesPayload",
    "plural": false,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "user",
        "storageKey": null,
        "args": null,
        "concreteType": "User",
        "plural": false,
        "selections": [
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "id",
            "args": null,
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "name",
            "args": null,
            "storageKey": null
          }
        ]
      }
    ]
  }
];
return {
  "kind": "Request",
  "operationKind": "subscription",
  "name": "UserSubscription",
  "id": null,
  "text": "subscription UserSubscription(\n  $input: UserChangesInput!\n) {\n  userChanges(input: $input) {\n    user {\n      id\n      name\n    }\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "UserSubscription",
    "type": "Subscription",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": v1
  },
  "operation": {
    "kind": "Operation",
    "name": "UserSubscription",
    "argumentDefinitions": v0,
    "selections": v1
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'a44fd60c02db3727737846630996e5e1';
module.exports = node;
