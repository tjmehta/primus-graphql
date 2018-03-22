/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteFragment} from 'relay-runtime';
export type UserContainer_user = {|
  +id: ?string;
  +name: ?string;
|};
*/


const fragment /*: ConcreteFragment*/ = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "UserContainer_user",
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
    },
    {
      "kind": "FragmentSpread",
      "name": "UpdateUserMutation_user",
      "args": null
    },
    {
      "kind": "FragmentSpread",
      "name": "UserSubscription_user",
      "args": null
    }
  ],
  "type": "User"
};

module.exports = fragment;
