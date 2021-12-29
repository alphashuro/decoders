// @flow strict

import { array } from './array';
import { boolean } from './boolean';
import { dict } from './mapping';
import { either } from './either';
import { lazy } from './lazy';
import { null_ } from './constants';
import { number } from './number';
import { string } from './string';
import type { Decoder } from '../_types';

export type JSONValue = null | string | number | boolean | JSONObject | JSONArray;
export type JSONObject = { [string]: JSONValue };
export type JSONArray = Array<JSONValue>;

export const jsonObject: Decoder<JSONObject> = lazy(() => dict(json));

export const jsonArray: Decoder<JSONArray> = lazy(() => array(json));

export const json: Decoder<JSONValue> = either(
    null_,
    string,
    number,
    boolean,
    jsonObject,
    jsonArray,
);
