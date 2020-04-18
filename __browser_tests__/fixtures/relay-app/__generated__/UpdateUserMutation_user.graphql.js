/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type UpdateUserMutation_user$ref: FragmentReference;
declare export opaque type UpdateUserMutation_user$fragmentType: UpdateUserMutation_user$ref;
export type UpdateUserMutation_user = {|
  +id: string,
  +$refType: UpdateUserMutation_user$ref,
|};
export type UpdateUserMutation_user$data = UpdateUserMutation_user;
export type UpdateUserMutation_user$key = {
  +$data?: UpdateUserMutation_user$data,
  +$fragmentRefs: UpdateUserMutation_user$ref,
  ...
};
*/


const node/*: ReaderFragment*/ = {
  "kind": "Fragment",
  "name": "UpdateUserMutation_user",
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
(node/*: any*/).hash = '3691eeb3c2ffbe1f08cefd2964697dcc';

module.exports = node;
