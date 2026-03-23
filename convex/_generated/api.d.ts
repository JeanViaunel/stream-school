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
import type * as ai from "../ai.js";
import type * as aiInternal from "../aiInternal.js";
import type * as analytics from "../analytics.js";
import type * as annotations from "../annotations.js";
import type * as assignmentQueries from "../assignmentQueries.js";
import type * as assignments from "../assignments.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as authConstants from "../authConstants.js";
import type * as authHelpers from "../authHelpers.js";
import type * as breakoutRooms from "../breakoutRooms.js";
import type * as breakoutRoomsInternal from "../breakoutRoomsInternal.js";
import type * as classes from "../classes.js";
import type * as convexAuthJwks from "../convexAuthJwks.js";
import type * as convexJwt from "../convexJwt.js";
import type * as crons from "../crons.js";
import type * as exports from "../exports.js";
import type * as grades from "../grades.js";
import type * as http from "../http.js";
import type * as icalExport from "../icalExport.js";
import type * as inAppNotifications from "../inAppNotifications.js";
import type * as meetings from "../meetings.js";
import type * as moderation from "../moderation.js";
import type * as moderationActions from "../moderationActions.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as parentLinks from "../parentLinks.js";
import type * as parents from "../parents.js";
import type * as polls from "../polls.js";
import type * as privacy from "../privacy.js";
import type * as privacyQueries from "../privacyQueries.js";
import type * as progress from "../progress.js";
import type * as questionBanks from "../questionBanks.js";
import type * as quizzes from "../quizzes.js";
import type * as reactions from "../reactions.js";
import type * as recordings from "../recordings.js";
import type * as recordingsNode from "../recordingsNode.js";
import type * as schedule from "../schedule.js";
import type * as sessions from "../sessions.js";
import type * as stream from "../stream.js";
import type * as submissions from "../submissions.js";
import type * as teachers from "../teachers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  aiInternal: typeof aiInternal;
  analytics: typeof analytics;
  annotations: typeof annotations;
  assignmentQueries: typeof assignmentQueries;
  assignments: typeof assignments;
  auditLog: typeof auditLog;
  auth: typeof auth;
  authConstants: typeof authConstants;
  authHelpers: typeof authHelpers;
  breakoutRooms: typeof breakoutRooms;
  breakoutRoomsInternal: typeof breakoutRoomsInternal;
  classes: typeof classes;
  convexAuthJwks: typeof convexAuthJwks;
  convexJwt: typeof convexJwt;
  crons: typeof crons;
  exports: typeof exports;
  grades: typeof grades;
  http: typeof http;
  icalExport: typeof icalExport;
  inAppNotifications: typeof inAppNotifications;
  meetings: typeof meetings;
  moderation: typeof moderation;
  moderationActions: typeof moderationActions;
  notifications: typeof notifications;
  organizations: typeof organizations;
  parentLinks: typeof parentLinks;
  parents: typeof parents;
  polls: typeof polls;
  privacy: typeof privacy;
  privacyQueries: typeof privacyQueries;
  progress: typeof progress;
  questionBanks: typeof questionBanks;
  quizzes: typeof quizzes;
  reactions: typeof reactions;
  recordings: typeof recordings;
  recordingsNode: typeof recordingsNode;
  schedule: typeof schedule;
  sessions: typeof sessions;
  stream: typeof stream;
  submissions: typeof submissions;
  teachers: typeof teachers;
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
