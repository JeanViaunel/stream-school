/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as assignments from "../assignments.js";
import type * as auth from "../auth.js";
import type * as classes from "../classes.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as moderation from "../moderation.js";
import type * as moderationActions from "../moderationActions.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as parentLinks from "../parentLinks.js";
import type * as polls from "../polls.js";
import type * as sessions from "../sessions.js";
import type * as stream from "../stream.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assignments: typeof assignments;
  auth: typeof auth;
  classes: typeof classes;
  crons: typeof crons;
  http: typeof http;
  moderation: typeof moderation;
  moderationActions: typeof moderationActions;
  notifications: typeof notifications;
  organizations: typeof organizations;
  parentLinks: typeof parentLinks;
  polls: typeof polls;
  sessions: typeof sessions;
  stream: typeof stream;
  submissions: typeof submissions;
  users: typeof users;
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
