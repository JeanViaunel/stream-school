import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Weekly parent digest - runs every Monday at 7:00 AM UTC
crons.cron(
  "weekly parent digest",
  "0 7 * * 1", // cron format: min hour day month dayOfWeek (Monday=1)
  internal.notifications.sendWeeklyDigest,
  {}
);

// FERPA Compliance - Data retention cleanup
// Runs weekly at 2:00 AM on Sunday
crons.cron(
  "data retention cleanup",
  "0 2 * * 0", // cron format: min hour day month dayOfWeek (Sunday=0)
  internal.privacy.dataRetentionCleanup,
  {}
);

// Cleanup expired data exports (daily at 3:00 AM)
crons.cron(
  "cleanup expired exports",
  "0 3 * * *", // daily at 3:00 AM
  internal.exports.cleanupExpiredExports,
  {}
);

export default crons;
