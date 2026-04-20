/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as outfits from "../outfits.js";
import type * as outfitsInternal from "../outfitsInternal.js";
import type * as preferences from "../preferences.js";
import type * as seed from "../seed.js";
import type * as shopping from "../shopping.js";
import type * as swipes from "../swipes.js";
import type * as users from "../users.js";
import type * as usersNode from "../usersNode.js";
import type * as wardrobe from "../wardrobe.js";
import type * as wardrobeUpload from "../wardrobeUpload.js";
import type * as weather from "../weather.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  outfits: typeof outfits;
  outfitsInternal: typeof outfitsInternal;
  preferences: typeof preferences;
  seed: typeof seed;
  shopping: typeof shopping;
  swipes: typeof swipes;
  users: typeof users;
  usersNode: typeof usersNode;
  wardrobe: typeof wardrobe;
  wardrobeUpload: typeof wardrobeUpload;
  weather: typeof weather;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
