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
      v.literal("admin")
    )),
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    subjectExpertise: v.optional(v.array(v.string())),
    yearsOfExperience: v.optional(v.number()),
    teacherBio: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    specializations: v.optional(v.array(v.string())),
    parentConsentGiven: v.optional(v.boolean()),
    parentConsentAt: v.optional(v.number()),
    // COPPA compliance fields
    birthDate: v.optional(v.string()),
    parentEmail: v.optional(v.string()),
    parentalConsentStatus: v.optional(v.union(
      v.literal("pending"), 
      v.literal("approved"), 
      v.literal("not_required")
    )),
    consentToken: v.optional(v.string()),
    consentVerifiedAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    lastSeenAt: v.optional(v.number()),
    deletionScheduledAt: v.optional(v.number()),
  })
    .index("by_username", ["username"])
    .index("by_organization", ["organizationId"])
    .index("by_role_and_organization", ["role", "organizationId"])
    .index("by_consent_token", ["consentToken"]),

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
    .index("by_stream_channel_id", ["streamChannelId"])
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
    recordingStartedAt: v.optional(v.number()),
    recordingEndedAt: v.optional(v.number()),
    summary: v.optional(v.string()),
    summaryGeneratedAt: v.optional(v.number()),
    summaryKeyPoints: v.optional(v.array(v.string())),
    annotations: v.optional(v.array(v.object({
      id: v.string(),
      userId: v.id("users"),
      type: v.union(v.literal("draw"), v.literal("text"), v.literal("highlight")),
      data: v.object({
        x: v.number(),
        y: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        color: v.string(),
        strokeWidth: v.optional(v.number()),
        text: v.optional(v.string()),
        points: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
      }),
      timestamp: v.number(),
      page: v.optional(v.number()),
    }))),
    liveReactions: v.optional(v.array(v.object({
      userId: v.id("users"),
      emoji: v.string(),
      timestamp: v.number(),
    }))),
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
    timeLimitMinutes: v.optional(v.number()),
    allowLateSubmissions: v.optional(v.boolean()),
  })
    .index("by_class", ["classId"])
    .index("by_session", ["sessionId"]),

  quizAttempts: defineTable({
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("expired")),
    answers: v.array(v.object({
      questionId: v.string(),
      value: v.string(),
    })),
    submissionId: v.optional(v.id("submissions")),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_student_and_assignment", ["studentId", "assignmentId"])
    .index("by_status", ["status"]),

  submissions: defineTable({
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    answers: v.array(v.object({
      questionId: v.string(),
      value: v.string(),
    })),
    submittedAt: v.number(),
    autoScore: v.optional(v.number()),
    autoGradedAt: v.optional(v.number()),
    teacherScore: v.optional(v.number()),
    teacherFeedback: v.optional(v.string()),
    isTeacherOverride: v.optional(v.boolean()),
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
    .index("by_class_and_scheduled_at", ["classId", "scheduledAt"])
    .index("by_teacher", ["teacherId"])
    .index("by_teacher_and_scheduled_at", ["teacherId", "scheduledAt"]),

  meetings: defineTable({
    organizationId: v.id("organizations"),
    hostId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    streamCallId: v.string(),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("active"),
      v.literal("ended"),
    ),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_host", ["hostId"])
    .index("by_stream_call_id", ["streamCallId"])
    .index("by_organization_and_status", ["organizationId", "status"]),

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

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("announcement"),
      v.literal("grade"),
      v.literal("session_reminder"),
      v.literal("mention"),
      v.literal("assignment")
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    link: v.optional(v.string()),
    metadata: v.optional(v.object({
      classId: v.optional(v.id("classes")),
      assignmentId: v.optional(v.id("assignments")),
      sessionId: v.optional(v.id("sessions")),
    })),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_user_created", ["userId", "createdAt"]),

  assignmentAttachments: defineTable({
    assignmentId: v.id("assignments"),
    filename: v.string(),
    url: v.string(),
    size: v.number(),
    mimeType: v.string(),
    uploadedAt: v.number(),
  }).index("by_assignment", ["assignmentId"]),

  submissionAttachments: defineTable({
    submissionId: v.id("submissions"),
    filename: v.string(),
    url: v.string(),
    size: v.number(),
    mimeType: v.string(),
    uploadedAt: v.number(),
  }).index("by_submission", ["submissionId"]),

  studentProgress: defineTable({
    studentId: v.id("users"),
    classId: v.id("classes"),
    overallProgress: v.number(), // 0-100
    assignmentProgress: v.number(),
    sessionAttendanceProgress: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_student_and_class", ["studentId", "classId"])
    .index("by_class", ["classId"]),

  milestones: defineTable({
    classId: v.id("classes"),
    name: v.string(),
    description: v.string(),
    type: v.union(v.literal("assignment_count"), v.literal("attendance_streak"), v.literal("grade_average")),
    targetValue: v.number(),
    order: v.number(),
  })
    .index("by_class", ["classId"])
    .index("by_class_and_order", ["classId", "order"]),

  completedMilestones: defineTable({
    milestoneId: v.id("milestones"),
    studentId: v.id("users"),
    completedAt: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_milestone", ["milestoneId"])
    .index("by_student_and_milestone", ["studentId", "milestoneId"]),

  breakoutRooms: defineTable({
    sessionId: v.id("sessions"),
    name: v.string(),
    streamCallId: v.string(),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"]),

  breakoutRoomAssignments: defineTable({
    roomId: v.id("breakoutRooms"),
    userId: v.id("users"),
    assignedAt: v.number(),
    joinedAt: v.optional(v.number()),
    sessionId: v.id("sessions"),
  })
    .index("by_room", ["roomId"])
    .index("by_user_and_session", ["userId", "sessionId"]),

  questionBanks: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    gradeLevel: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_subject", ["organizationId", "subject"])
    .index("by_organization_and_grade", ["organizationId", "gradeLevel"]),

  questionBankItems: defineTable({
    bankId: v.id("questionBanks"),
    question: v.object({
      id: v.string(),
      text: v.string(),
      type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
      options: v.optional(v.array(v.string())),
      correctOption: v.optional(v.number()),
      explanation: v.optional(v.string()),
      difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
      tags: v.optional(v.array(v.string())),
    }),
    usageCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_bank", ["bankId"])
    .index("by_bank_and_difficulty", ["bankId", "question.difficulty"]),

  importLogs: defineTable({
    organizationId: v.id("organizations"),
    classId: v.id("classes"),
    importedBy: v.id("users"),
    totalRows: v.number(),
    importedCount: v.number(),
    errorCount: v.number(),
    errors: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_class", ["classId"])
    .index("by_imported_by", ["importedBy"]),

  // FERPA compliance - data export tracking
  dataExports: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    requestType: v.union(v.literal("gdpr"), v.literal("ferpa")),
    dataTypes: v.array(v.string()), // ['submissions', 'grades', 'messages', etc.]
    downloadUrl: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_organization", ["organizationId"]),

  // FERPA compliance - data access audit log
  dataAccessLogs: defineTable({
    organizationId: v.id("organizations"),
    actorId: v.id("users"), // who accessed
    targetId: v.id("users"), // whose data
    action: v.string(), // 'view', 'export', 'delete', etc.
    resourceType: v.string(), // 'grade', 'submission', 'message'
    resourceId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    accessedAt: v.number(),
  })
    .index("by_target", ["targetId"])
    .index("by_target_and_time", ["targetId", "accessedAt"])
    .index("by_actor", ["actorId"])
    .index("by_organization", ["organizationId"]),

  // AI Usage Tracking for rate limiting
  aiUsageLogs: defineTable({
    userId: v.id("users"),
    feature: v.string(), // 'tutor', 'summary', 'quiz_generation', etc.
    classId: v.optional(v.id("classes")),
    sessionId: v.optional(v.id("sessions")),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_timestamp", ["userId", "timestamp"])
    .index("by_class", ["classId"])
    .index("by_session", ["sessionId"]),
});
