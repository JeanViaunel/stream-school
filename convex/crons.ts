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

export default crons;
