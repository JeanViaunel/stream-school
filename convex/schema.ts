import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    streamUserId: v.string(),
    displayName: v.string(),
    createdAt: v.number(),
    role: v.optional(v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("co_teacher"),
      v.literal("parent"),
      v.literal("school_admin"),
      v.literal("platform_admin")
    )),
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number()),
    avatarUrl: v.optional(v.string()),
    parentConsentGiven: v.optional(v.boolean()),
    parentConsentAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    lastSeenAt: v.optional(v.number()),
    deletionScheduledAt: v.optional(v.number()),
  })
    .index("by_username", ["username"])
    .index("by_organization", ["organizationId"])
    .index("by_role_and_organization", ["role", "organizationId"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    createdAt: v.number(),
    settings: v.object({
      studentDmsEnabled: v.boolean(),
      recordingEnabled: v.boolean(),
      lobbyEnabled: v.boolean(),
      maxClassSize: v.number(),
      dataRetentionDays: v.number(),
    }),
  }).index("by_slug", ["slug"]),

  classes: defineTable({
    organizationId: v.id("organizations"),
    teacherId: v.id("users"),
    name: v.string(),
    subject: v.string(),
    gradeLevel: v.number(),
    streamChannelId: v.string(),
    joinCode: v.string(),
    isArchived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_teacher", ["teacherId"])
    .index("by_join_code", ["joinCode"]),

  enrollments: defineTable({
    classId: v.id("classes"),
    studentId: v.id("users"),
    enrolledAt: v.number(),
    status: v.union(v.literal("active"), v.literal("removed")),
  })
    .index("by_class", ["classId"])
    .index("by_student", ["studentId"])
    .index("by_class_and_student", ["classId", "studentId"]),

  parentLinks: defineTable({
    parentId: v.id("users"),
    studentId: v.id("users"),
    linkedAt: v.number(),
    consentGiven: v.boolean(),
    consentMethod: v.string(),
  })
    .index("by_parent", ["parentId"])
    .index("by_student", ["studentId"])
    .index("by_parent_and_student", ["parentId", "studentId"]),

  sessions: defineTable({
    classId: v.id("classes"),
    hostId: v.id("users"),
    streamCallId: v.string(),
    scheduledAt: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    recordingUrl: v.optional(v.string()),
    recordingConsentRequired: v.boolean(),
  })
    .index("by_class", ["classId"])
    .index("by_class_and_started_at", ["classId", "startedAt"])
    .index("by_stream_call_id", ["streamCallId"]),

  sessionLogs: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    wasAdmittedFromLobby: v.boolean(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  assignments: defineTable({
    classId: v.id("classes"),
    creatorId: v.id("users"),
    title: v.string(),
    instructions: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
    questions: v.array(v.object({
      id: v.string(),
      text: v.string(),
      options: v.optional(v.array(v.string())),
      correctOption: v.optional(v.number()),
    })),
    dueDateAt: v.optional(v.number()),
    sessionId: v.optional(v.id("sessions")),
    isPublished: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_class", ["classId"])
    .index("by_session", ["sessionId"]),

  submissions: defineTable({
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    answers: v.array(v.object({
      questionId: v.string(),
      value: v.string(),
    })),
    submittedAt: v.number(),
    autoScore: v.optional(v.number()),
    teacherScore: v.optional(v.number()),
    teacherFeedback: v.optional(v.string()),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_assignment_and_student", ["assignmentId", "studentId"]),

  grades: defineTable({
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    submissionId: v.optional(v.id("submissions")),
    score: v.number(), // 0-100 or raw points
    maxScore: v.number(),
    feedback: v.optional(v.string()),
    gradedBy: v.id("users"), // teacher who assigned the grade
    gradedAt: v.number(),
    classId: v.id("classes"),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_class", ["classId"])
    .index("by_assignment_and_student", ["assignmentId", "studentId"]),

  polls: defineTable({
    sessionId: v.id("sessions"),
    classId: v.id("classes"),
    creatorId: v.id("users"),
    question: v.string(),
    options: v.array(v.string()),
    isOpen: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"]),

  pollResponses: defineTable({
    pollId: v.id("polls"),
    studentId: v.id("users"),
    selectedOption: v.number(),
    respondedAt: v.number(),
  })
    .index("by_poll", ["pollId"])
    .index("by_poll_and_student", ["pollId", "studentId"]),

  moderationFlags: defineTable({
    messageId: v.string(),
    channelId: v.string(),
    userId: v.id("users"),
    messageText: v.string(),
    toxicityScore: v.number(),
    severeToxicityScore: v.number(),
    identityAttackScore: v.number(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("actioned"), v.literal("dismissed")),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_message", ["messageId"])
    .index("by_organization_and_status", ["organizationId", "status"]),

  scheduledSessions: defineTable({
    classId: v.id("classes"),
    teacherId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.number(), // Unix timestamp
    durationMinutes: v.number(), // default 60
    icalUid: v.string(), // unique ID for iCal feeds
    isArchived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_class", ["classId"])
    .index("by_class_and_scheduled_at", ["classId", "scheduledAt"]),

  auditLogs: defineTable({
    organizationId: v.id("organizations"),
    actorId: v.id("users"),
    action: v.string(),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_created_at", ["organizationId", "createdAt"]),
});
