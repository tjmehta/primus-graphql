/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type UserSubscription_user$ref: FragmentReference;
declare export opaque type UserSubscription_user$fragmentType: UserSubscription_user$ref;
export type UserSubscription_user = {|
  +id: string,
  +$refType: UserSubscription_user$ref,
|};
export type UserSubscription_user$data = UserSubscription_user;
export type UserSubscription_user$key = {
  +$data?: UserSubscription_user$data,
  +$fragmentRefs: UserSubscription_user$ref,
  ...
};
*/


const node/*: ReaderFragment*/ = {
  "kind": "Fragment",
  "name": "UserSubscription_user",
  "type": "User",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "id",
      "args": null,
      "storageKey": null
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = '8f6e84d3e476f21a10241a79f9e048eb';

module.exports = node;
