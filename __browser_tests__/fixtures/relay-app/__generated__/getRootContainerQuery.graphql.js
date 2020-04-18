/**
 * @flow
 * @relayHash 24175dfa930d189228cb4c12224b3c6a
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type UserContainer_user$ref = any;
export type getRootContainerQueryVariables = {|
  userId?: ?string
|};
export type getRootContainerQueryResponse = {|
  +user: ?{|
    +$fragmentRefs: UserContainer_user$ref
  |}
|};
export type getRootContainerQuery = {|
  variables: getRootContainerQueryVariables,
  response: getRootContainerQueryResponse,
|};
*/


/*
query getRootContainerQuery(
  $userId: String
) {
  user(id: $userId) {
    ...UserContainer_user
    id
  }
}

fragment UpdateUserMutation_user on User {
  id
}

fragment UserContainer_user on User {
  id
  name
  ...UpdateUserMutation_user
  ...UserSubscription_user
}

fragment UserSubscription_user on User {
  id
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "userId",
    "type": "String",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "userId"
  }
];
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "getRootContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "user",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "User",
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "UserContainer_user",
            "args": null
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "getRootContainerQuery",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "user",
        "storageKey": null,
        "args": (v1/*: any*/),
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
  },
  "params": {
    "operationKind": "query",
    "name": "getRootContainerQuery",
    "id": null,
    "text": "query getRootContainerQuery(\n  $userId: String\n) {\n  user(id: $userId) {\n    ...UserContainer_user\n    id\n  }\n}\n\nfragment UpdateUserMutation_user on User {\n  id\n}\n\nfragment UserContainer_user on User {\n  id\n  name\n  ...UpdateUserMutation_user\n  ...UserSubscription_user\n}\n\nfragment UserSubscription_user on User {\n  id\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '8a87e7f166e4de0c337caaec5fb73ab4';

module.exports = node;
