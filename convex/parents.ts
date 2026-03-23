import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { usernameFromIdentity } from "./authHelpers";

// Helper function to verify parent role and get user
async function getParentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "parent") {
    throw new Error("Only parents can access this feature");
  }

  return user;
}

// Helper function to verify parent-student link with consent
async function verifyParentLink(
  ctx: any, 
  parentId: Id<"users">, 
  studentId: Id<"users">
): Promise<boolean> {
  const link = await ctx.db
    .query("parentLinks")
    .withIndex("by_parent_and_student", (q) =>
      q.eq("parentId", parentId).eq("studentId", studentId)
    )
    .unique();

  return !!link && link.consentGiven;
}

/**
 * Get comprehensive dashboard data for a parent
 * Returns all linked students with their classes, progress, grades, and announcements
 */
export const getParentDashboard = query({
  args: {},
  returns: v.object({
    linkedStudents: v.array(v.object({
      studentId: v.id("users"),
      name: v.string(),
      gradeLevel: v.optional(v.number()),
      avatarUrl: v.optional(v.string()),
      classes: v.array(v.object({
        classId: v.id("classes"),
        className: v.string(),
        subject: v.string(),
        teacherName: v.string(),
        teacherId: v.id("users"),
        progress: v.number(),
        assignmentProgress: v.number(),
        attendanceProgress: v.number(),
        recentGrades: v.array(v.object({
          assignmentTitle: v.string(),
          score: v.number(),
          maxScore: v.number(),
          percentage: v.number(),
          date: v.number(),
        })),
        attendanceRate: v.number(),
        totalSessions: v.number(),
        attendedSessions: v.number(),
      })),
    })),
    recentAnnouncements: v.array(v.object({
      announcementId: v.id("announcements"),
      classId: v.id("classes"),
      className: v.string(),
      title: v.string(),
      content: v.string(),
      authorName: v.string(),
      publishedAt: v.number(),
      isPinned: v.boolean(),
    })),
    dashboardStats: v.object({
      totalStudents: v.number(),
      totalClasses: v.number(),
      averageProgress: v.number(),
      recentGradesCount: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const parent = await getParentUser(ctx);

    // Get all parent links with consent
    const links = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
      .collect();

    // Filter for consent given
    const consentLinks = links.filter(link => link.consentGiven);

    let totalClasses = 0;
    let totalProgress = 0;
    let recentGradesCount = 0;

    // Get data for each linked student
    const linkedStudents = await Promise.all(
      consentLinks.map(async (link) => {
        const student = await ctx.db.get(link.studentId);
        if (!student) return null;

        // Get enrollments
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_student", (q) => q.eq("studentId", link.studentId))
          .collect();

        // Filter for active enrollments
        const activeEnrollments = enrollments.filter(e => e.status === "active");

        const classes = await Promise.all(
          activeEnrollments.map(async (enrollment) => {
            const cls = await ctx.db.get(enrollment.classId);
            if (!cls) return null;

            const teacher = await ctx.db.get(cls.teacherId);
            
            // Get progress
            const progress = await ctx.db
              .query("studentProgress")
              .withIndex("by_student_and_class", (q) =>
                q.eq("studentId", link.studentId).eq("classId", enrollment.classId)
              )
              .unique();

            // Get recent grades (last 5)
            const allGrades = await ctx.db
              .query("grades")
              .withIndex("by_student", (q) => q.eq("studentId", link.studentId))
              .collect();

            // Filter and sort grades for this class
            const recentGrades = allGrades
              .filter(g => g.classId === enrollment.classId)
              .sort((a, b) => b.gradedAt - a.gradedAt)
              .slice(0, 5);

            const gradesWithTitles = await Promise.all(
              recentGrades.map(async (grade) => {
                const assignment = await ctx.db.get(grade.assignmentId);
                return {
                  assignmentTitle: assignment?.title || "Unknown Assignment",
                  score: grade.score,
                  maxScore: grade.maxScore,
                  percentage: Math.round((grade.score / grade.maxScore) * 100),
                  date: grade.gradedAt,
                };
              })
            );

            // Get attendance
            const sessions = await ctx.db
              .query("sessions")
              .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
              .collect();

            const sessionLogs = await ctx.db
              .query("sessionLogs")
              .withIndex("by_user", (q) => q.eq("userId", link.studentId))
              .collect();

            const attendedSessionIds = new Set(sessionLogs.map(l => l.sessionId));
            const attendedSessions = sessions.filter(s => attendedSessionIds.has(s._id)).length;
            const attendanceRate = sessions.length > 0 
              ? Math.round((attendedSessions / sessions.length) * 100) 
              : 0;

            totalClasses++;
            totalProgress += progress?.overallProgress || 0;
            recentGradesCount += gradesWithTitles.length;

            return {
              classId: enrollment.classId,
              className: cls.name,
              subject: cls.subject,
              teacherName: teacher?.displayName || "Unknown",
              teacherId: cls.teacherId,
              progress: progress?.overallProgress || 0,
              assignmentProgress: progress?.assignmentProgress || 0,
              attendanceProgress: progress?.sessionAttendanceProgress || 0,
              recentGrades: gradesWithTitles,
              attendanceRate,
              totalSessions: sessions.length,
              attendedSessions,
            };
          })
        );

        return {
          studentId: link.studentId,
          name: student.displayName,
          gradeLevel: student.gradeLevel,
          avatarUrl: student.avatarUrl,
          classes: classes.filter((c): c is NonNullable<typeof c> => c !== null),
        };
      })
    );

    // Get recent announcements from all classes
    const allClassIds = linkedStudents
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .flatMap(s => s.classes.map(c => c.classId));

    const uniqueClassIds = [...new Set(allClassIds)];
    
    let recentAnnouncements: any[] = [];
    for (const classId of uniqueClassIds) {
      // Note: announcements table may not exist yet, handle gracefully
      try {
        const cls = await ctx.db.get(classId);
        if (!cls) continue;

        // Get announcements for this class (if table exists)
        // This would need to be implemented when announcements feature is added
        // For now, return empty array
      } catch (e) {
        // Table doesn't exist yet
      }
    }

    const validStudents = linkedStudents.filter((s): s is NonNullable<typeof s> => s !== null);

    return {
      linkedStudents: validStudents,
      recentAnnouncements: recentAnnouncements.slice(0, 10),
      dashboardStats: {
        totalStudents: validStudents.length,
        totalClasses,
        averageProgress: totalClasses > 0 ? Math.round(totalProgress / totalClasses) : 0,
        recentGradesCount,
      },
    };
  },
});

/**
 * Link a student to a parent (initiated by parent)
 * Creates a pending link that requires student consent
 */
export const linkStudentToParent = mutation({
  args: {
    studentUsername: v.string(),
    consentMethod: v.optional(v.string()),
  },
  returns: v.object({
    linkId: v.id("parentLinks"),
    status: v.string(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const parent = await getParentUser(ctx);

    // Find student by username
    const student = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.studentUsername))
      .unique();

    if (!student) {
      throw new Error("Student not found");
    }

    if (student.role !== "student") {
      throw new Error("Can only link to student accounts");
    }

    // Check for existing link
    const existingLink = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent_and_student", (q) =>
        q.eq("parentId", parent._id).eq("studentId", student._id)
      )
      .unique();

    if (existingLink) {
      if (existingLink.consentGiven) {
        return {
          linkId: existingLink._id,
          status: "already_linked",
          message: "You are already linked to this student",
        };
      } else {
        return {
          linkId: existingLink._id,
          status: "pending_consent",
          message: "Link request is pending student consent",
        };
      }
    }

    // Create new link
    const linkId = await ctx.db.insert("parentLinks", {
      parentId: parent._id,
      studentId: student._id,
      linkedAt: Date.now(),
      consentGiven: false,
      consentMethod: args.consentMethod || "pending",
    });

    // Send notification to student
    try {
      await ctx.runMutation(internal.inAppNotifications.createNotification, {
        userId: student._id,
        type: "announcement",
        title: "Parent Link Request",
        message: `${parent.displayName} wants to link to your account to view your progress`,
        link: `/settings/parent-consent`,
      });
    } catch (e) {
      // Notification service may not be available
      console.log("Could not send notification:", e);
    }

    return {
      linkId,
      status: "pending",
      message: "Link request sent. Waiting for student consent.",
    };
  },
});

/**
 * Remove a parent-student link
 * Can be initiated by either parent or student
 */
export const unlinkStudentFromParent = mutation({
  args: {
    linkId: v.id("parentLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    // Only parent, student, or admin can unlink
    const isParent = link.parentId === user._id;
    const isStudent = link.studentId === user._id;
    const isAdmin = user.role === "admin";

    if (!isParent && !isStudent && !isAdmin) {
      throw new Error("Not authorized to remove this link");
    }

    await ctx.db.delete(args.linkId);

    // Notify the other party
    const notifyUserId = isParent ? link.studentId : link.parentId;
    try {
      await ctx.runMutation(internal.inAppNotifications.createNotification, {
        userId: notifyUserId,
        type: "announcement",
        title: "Parent Link Removed",
        message: `The link with ${user.displayName} has been removed`,
      });
    } catch (e) {
      // Notification may not be available
    }

    return null;
  },
});

/**
 * Student gives consent for parent to view their data
 */
export const giveConsent = mutation({
  args: {
    linkId: v.id("parentLinks"),
    consentMethod: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    if (link.studentId !== user._id) {
      throw new Error("Only the student can give consent");
    }

    await ctx.db.patch(args.linkId, {
      consentGiven: true,
      consentMethod: args.consentMethod,
    });

    // Notify parent
    try {
      await ctx.runMutation(internal.inAppNotifications.createNotification, {
        userId: link.parentId,
        type: "announcement",
        title: "Link Approved",
        message: `${user.displayName} has approved your parent access request`,
        link: "/parent/dashboard",
      });
    } catch (e) {
      // Notification may not be available
    }

    return null;
  },
});

/**
 * Get all students linked to a parent
 */
export const getLinkedStudents = query({
  args: {},
  returns: v.array(v.object({
    linkId: v.id("parentLinks"),
    studentId: v.id("users"),
    name: v.string(),
    username: v.string(),
    gradeLevel: v.optional(v.number()),
    avatarUrl: v.optional(v.string()),
    consentGiven: v.boolean(),
    linkedAt: v.number(),
  })),
  handler: async (ctx) => {
    const parent = await getParentUser(ctx);

    const links = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
      .collect();

    const students = await Promise.all(
      links.map(async (link) => {
        const student = await ctx.db.get(link.studentId);
        if (!student) return null;

        return {
          linkId: link._id,
          studentId: link.studentId,
          name: student.displayName,
          username: student.username,
          gradeLevel: student.gradeLevel,
          avatarUrl: student.avatarUrl,
          consentGiven: link.consentGiven,
          linkedAt: link.linkedAt,
        };
      })
    );

    return students.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

/**
 * Get detailed progress for a specific student (parent view)
 * Includes grades, attendance, assignments, and milestones
 */
export const getStudentProgressForParent = query({
  args: {
    studentId: v.id("users"),
  },
  returns: v.object({
    student: v.object({
      studentId: v.id("users"),
      name: v.string(),
      gradeLevel: v.optional(v.number()),
      avatarUrl: v.optional(v.string()),
    }),
    classProgress: v.array(v.object({
      classId: v.id("classes"),
      className: v.string(),
      subject: v.string(),
      teacherName: v.string(),
      overallProgress: v.number(),
      assignmentProgress: v.number(),
      attendanceProgress: v.number(),
      lastUpdated: v.number(),
    })),
    recentGrades: v.array(v.object({
      gradeId: v.id("grades"),
      assignmentId: v.id("assignments"),
      assignmentTitle: v.string(),
      classId: v.id("classes"),
      className: v.string(),
      score: v.number(),
      maxScore: v.number(),
      percentage: v.number(),
      feedback: v.optional(v.string()),
      gradedAt: v.number(),
      gradedByName: v.string(),
    })),
    gradeHistory: v.array(v.object({
      date: v.number(),
      averageScore: v.number(),
      assignmentCount: v.number(),
    })),
    attendanceSummary: v.object({
      totalSessions: v.number(),
      attendedSessions: v.number(),
      missedSessions: v.number(),
      attendanceRate: v.number(),
      streakDays: v.number(),
    }),
    upcomingAssignments: v.array(v.object({
      assignmentId: v.id("assignments"),
      title: v.string(),
      classId: v.id("classes"),
      className: v.string(),
      dueDate: v.optional(v.number()),
      isSubmitted: v.boolean(),
    })),
    completedMilestones: v.array(v.object({
      milestoneId: v.id("milestones"),
      name: v.string(),
      description: v.string(),
      completedAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const parent = await getParentUser(ctx);

    // Verify link exists with consent
    const hasConsent = await verifyParentLink(ctx, parent._id, args.studentId);
    if (!hasConsent) {
      throw new Error("No consent given to view this student's data");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    // Get enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    // Filter for active enrollments
    const activeEnrollments = enrollments.filter(e => e.status === "active");

    // Get class progress
    const classProgress = await Promise.all(
      activeEnrollments.map(async (enrollment) => {
        const cls = await ctx.db.get(enrollment.classId);
        if (!cls) return null;

        const teacher = await ctx.db.get(cls.teacherId);
        const progress = await ctx.db
          .query("studentProgress")
          .withIndex("by_student_and_class", (q) =>
            q.eq("studentId", args.studentId).eq("classId", enrollment.classId)
          )
          .unique();

        return {
          classId: enrollment.classId,
          className: cls.name,
          subject: cls.subject,
          teacherName: teacher?.displayName || "Unknown",
          overallProgress: progress?.overallProgress || 0,
          assignmentProgress: progress?.assignmentProgress || 0,
          attendanceProgress: progress?.sessionAttendanceProgress || 0,
          lastUpdated: progress?.lastUpdated || 0,
        };
      })
    );

    // Get all grades
    const allGrades = await ctx.db
      .query("grades")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    // Sort by date descending and take first 10
    const sortedGrades = allGrades.sort((a, b) => b.gradedAt - a.gradedAt);

    const recentGrades = await Promise.all(
      sortedGrades.slice(0, 10).map(async (grade) => {
        const assignment = await ctx.db.get(grade.assignmentId);
        const cls = await ctx.db.get(grade.classId);
        const teacher = await ctx.db.get(grade.gradedBy);

        return {
          gradeId: grade._id,
          assignmentId: grade.assignmentId,
          assignmentTitle: assignment?.title || "Unknown",
          classId: grade.classId,
          className: cls?.name || "Unknown",
          score: grade.score,
          maxScore: grade.maxScore,
          percentage: Math.round((grade.score / grade.maxScore) * 100),
          feedback: grade.feedback,
          gradedAt: grade.gradedAt,
          gradedByName: teacher?.displayName || "Unknown",
        };
      })
    );

    // Calculate grade history (group by week)
    const gradesByWeek = new Map<number, { total: number; count: number }>();
    for (const grade of allGrades) {
      const weekStart = Math.floor(grade.gradedAt / (7 * 24 * 60 * 60 * 1000)) * (7 * 24 * 60 * 60 * 1000);
      const existing = gradesByWeek.get(weekStart);
      if (existing) {
        existing.total += (grade.score / grade.maxScore) * 100;
        existing.count++;
      } else {
        gradesByWeek.set(weekStart, { total: (grade.score / grade.maxScore) * 100, count: 1 });
      }
    }

    const gradeHistory = Array.from(gradesByWeek.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([date, data]) => ({
        date,
        averageScore: Math.round(data.total / data.count),
        assignmentCount: data.count,
      }));

    // Get attendance summary across all classes
    let totalSessions = 0;
    let attendedSessions = 0;
    let streakDays = 0;

    for (const enrollment of activeEnrollments) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
        .collect();

      const sessionLogs = await ctx.db
        .query("sessionLogs")
        .withIndex("by_user", (q) => q.eq("userId", args.studentId))
        .collect();

      const attendedSessionIds = new Set(sessionLogs.map(l => l.sessionId));
      
      totalSessions += sessions.length;
      attendedSessions += sessions.filter(s => attendedSessionIds.has(s._id)).length;
    }

    const attendanceRate = totalSessions > 0 
      ? Math.round((attendedSessions / totalSessions) * 100) 
      : 0;

    // Get upcoming assignments
    const now = Date.now();
    const upcomingAssignments: any[] = [];
    
    for (const enrollment of activeEnrollments) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", enrollment.classId))
        .collect();

      // Filter for published assignments
      const publishedAssignments = assignments.filter(a => a.isPublished);

      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
        .collect();

      const submittedAssignmentIds = new Set(submissions.map(s => s.assignmentId));
      const cls = await ctx.db.get(enrollment.classId);

      for (const assignment of publishedAssignments) {
        if (assignment.dueDateAt && assignment.dueDateAt > now && !submittedAssignmentIds.has(assignment._id)) {
          upcomingAssignments.push({
            assignmentId: assignment._id,
            title: assignment.title,
            classId: enrollment.classId,
            className: cls?.name || "Unknown",
            dueDate: assignment.dueDateAt,
            isSubmitted: false,
          });
        }
      }
    }

    // Sort by due date
    upcomingAssignments.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

    // Get completed milestones
    const completedMilestonesList = await ctx.db
      .query("completedMilestones")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const completedMilestones = await Promise.all(
      completedMilestonesList
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 10)
        .map(async (cm) => {
          const milestone = await ctx.db.get(cm.milestoneId);
          return {
            milestoneId: cm.milestoneId,
            name: milestone?.name || "Unknown",
            description: milestone?.description || "",
            completedAt: cm.completedAt,
          };
        })
    );

    return {
      student: {
        studentId: args.studentId,
        name: student.displayName,
        gradeLevel: student.gradeLevel,
        avatarUrl: student.avatarUrl,
      },
      classProgress: classProgress.filter((c): c is NonNullable<typeof c> => c !== null),
      recentGrades,
      gradeHistory,
      attendanceSummary: {
        totalSessions,
        attendedSessions,
        missedSessions: totalSessions - attendedSessions,
        attendanceRate,
        streakDays,
      },
      upcomingAssignments: upcomingAssignments.slice(0, 10),
      completedMilestones,
    };
  },
});

/**
 * Generate a PDF report for a student (parent view)
 * Basic structure for PDF generation capability
 */
export const generateStudentReport = mutation({
  args: {
    studentId: v.id("users"),
    reportType: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("full")),
  },
  returns: v.object({
    reportId: v.string(),
    generatedAt: v.number(),
    downloadUrl: v.optional(v.string()),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    const parent = await getParentUser(ctx);

    // Verify link exists with consent
    const hasConsent = await verifyParentLink(ctx, parent._id, args.studentId);
    if (!hasConsent) {
      throw new Error("No consent given to view this student's data");
    }

    const reportId = `report_${args.studentId}_${Date.now()}`;
    const generatedAt = Date.now();

    // TODO: Implement actual PDF generation using a library like jsPDF
    // For now, return a placeholder response
    
    return {
      reportId,
      generatedAt,
      status: "pending",
    };
  },
});

/**
 * Internal query to get parent link for verification
 */
export const getParentLinkInternal = internalQuery({
  args: {
    parentId: v.id("users"),
    studentId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("parentLinks"),
      consentGiven: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("parentLinks")
      .withIndex("by_parent_and_student", (q) =>
        q.eq("parentId", args.parentId).eq("studentId", args.studentId)
      )
      .unique();

    return link ? { _id: link._id, consentGiven: link.consentGiven } : null;
  },
});
