import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

function canBeClassTeacher(role: string | undefined): boolean {
  return (
    role === "teacher" ||
    role === "co_teacher" ||
    role === "admin"
  );
}

export const createClass = action({
  args: {
    name: v.string(),
    subject: v.string(),
    gradeLevel: v.number(),
    teacherId: v.id("users"),
  },
  returns: v.object({
    classId: v.id("classes"),
    streamChannelId: v.string(),
    joinCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user: {
      _id: Id<"users">;
      role?: string;
      organizationId?: Id<"organizations">;
      streamUserId: string;
    } | null = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.role || user.role !== "admin") {
      throw new Error("Only admins can create classes");
    }

    if (!user.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const teacher = await ctx.runQuery(internal.users.getUserById, { userId: args.teacherId });
    if (!teacher) {
      throw new Error("Teacher not found");
    }

    if (!canBeClassTeacher(teacher.role)) {
      throw new Error(
        "Class lead must be a teacher, co-teacher, or admin",
      );
    }

    const teacherInOrg: boolean = await ctx.runQuery(
      internal.users.userMatchesOrgForAdmin,
      {
        userId: args.teacherId,
        organizationId: user.organizationId,
      },
    );
    if (!teacherInOrg) {
      throw new Error("Teacher must belong to the same organization");
    }
    await ctx.runMutation(internal.users.setOrganizationIfUnset, {
      userId: args.teacherId,
      organizationId: user.organizationId,
    });

    const joinCode = Array.from({ length: 6 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))
    ).join("");

    const streamChannelId = `class_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    await ctx.runAction(internal.stream.createClassChannel, {
      channelId: streamChannelId,
      name: args.name,
      teacherStreamUserId: teacher.streamUserId,
    });

    // Ensure the assigned teacher is also a Stream member for chat visibility/removals.
    await ctx.runAction(internal.stream.addMemberToChannel, {
      channelId: streamChannelId,
      streamUserId: teacher.streamUserId,
    });

    const classId: Id<"classes"> = await ctx.runMutation(internal.classes.insertClass, {
      organizationId: user.organizationId,
      teacherId: args.teacherId,
      name: args.name,
      subject: args.subject,
      gradeLevel: args.gradeLevel,
      streamChannelId,
      joinCode,
    });

    return {
      classId,
      streamChannelId,
      joinCode,
    };
  },
});

export const ensureAdminReadOnlyInClassroomChat = action({
  args: { classId: v.id("classes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user: {
      _id: Id<"users">;
      role?: string;
      streamUserId: string;
      organizationId?: Id<"organizations">;
    } | null = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user || user.role !== "admin") {
      throw new Error("Not authorized");
    }
    if (!user.organizationId) {
      throw new Error("Admin has no organization");
    }

    const cls = await ctx.runQuery(internal.classes.getClassByIdInternal, {
      classId: args.classId,
    });

    if (!cls) {
      throw new Error("Class not found");
    }
    if (cls.organizationId !== user.organizationId) {
      throw new Error("Class not in admin organization");
    }

    // Read-only enforcement is handled at the UI level in ChannelView.
    // Stream Chat does not support "guest" as a channel member role.
    return null;
  },
});

function isTeacherRole(role: string | undefined): boolean {
  return role === "teacher" || role === "co_teacher";
}

const classByStreamChannelIdInternalValidator = v.union(
  v.object({
    _id: v.id("classes"),
    teacherId: v.id("users"),
    isArchived: v.boolean(),
  }),
  v.null(),
);

export const getClassByStreamChannelIdInternal = internalQuery({
  args: { streamChannelId: v.string() },
  returns: classByStreamChannelIdInternalValidator,
  handler: async (ctx, args) => {
    const cls = await ctx.db
      .query("classes")
      .withIndex("by_stream_channel_id", (q) =>
        q.eq("streamChannelId", args.streamChannelId),
      )
      .unique();
    if (!cls) return null;

    return { _id: cls._id, teacherId: cls.teacherId, isArchived: cls.isArchived };
  },
});

export const authorizeClassroomCallStart = action({
  args: { streamChannelId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user: {
      _id: Id<"users">;
      role?: string;
    } | null = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) throw new Error("User not found");
    if (!isTeacherRole(user.role)) {
      throw new Error("Only teachers can start classroom calls");
    }

    const cls = await ctx.runQuery(internal.classes.getClassByStreamChannelIdInternal, {
      streamChannelId: args.streamChannelId,
    });

    if (!cls) throw new Error("Class not found");
    if (cls.isArchived) throw new Error("This class is archived");

    if (cls.teacherId !== user._id) {
      throw new Error("Only the assigned class teacher can start classroom calls");
    }

    return null;
  },
});

async function requireAdminOrg(ctx: ActionCtx): Promise<{
  adminUser: { _id: Id<"users">; organizationId: Id<"organizations"> };
  orgId: Id<"organizations">;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const adminUser = await ctx.runQuery(internal.users.getUserByUsername, {
    username: usernameFromIdentity(identity),
  });

  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("Only admins can perform this action");
  }
  if (!adminUser.organizationId) {
    throw new Error("Admin user not found");
  }

  return { adminUser: { _id: adminUser._id, organizationId: adminUser.organizationId }, orgId: adminUser.organizationId };
}

export const getClassByIdInternal = internalQuery({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      streamChannelId: v.string(),
      name: v.string(),
      isArchived: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId);
    if (!cls) return null;
    return {
      _id: cls._id,
      organizationId: cls.organizationId,
      teacherId: cls.teacherId,
      streamChannelId: cls.streamChannelId,
      name: cls.name,
      isArchived: cls.isArchived,
    };
  },
});

export const setTeacherForClass = internalMutation({
  args: {
    classId: v.id("classes"),
    teacherId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.classId, { teacherId: args.teacherId });
    return null;
  },
});

export const adminAddStudentToClass = action({
  args: { classId: v.id("classes"), studentId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { adminUser, orgId } = await requireAdminOrg(ctx);

    const cls = await ctx.runQuery(internal.classes.getClassByIdInternal, {
      classId: args.classId,
    });
    if (!cls) throw new Error("Class not found");
    if (cls.isArchived) throw new Error("This class is archived");
    if (cls.organizationId !== orgId) {
      throw new Error("Class not in admin organization");
    }

    const student = await ctx.runQuery(internal.users.getUserById, {
      userId: args.studentId,
    });
    if (!student) throw new Error("Student not found");
    if (!student.role || student.role !== "student") {
      throw new Error("Only student users can be added to classes");
    }
    const studentInOrg: boolean = await ctx.runQuery(
      internal.users.userMatchesOrgForAdmin,
      { userId: args.studentId, organizationId: orgId },
    );
    if (!studentInOrg) {
      throw new Error("Student not in admin organization");
    }
    await ctx.runMutation(internal.users.setOrganizationIfUnset, {
      userId: args.studentId,
      organizationId: orgId,
    });

    await ctx.runMutation(internal.classes.upsertEnrollment, {
      classId: args.classId,
      studentId: args.studentId,
    });

    // Add to Stream chat so they can read/post in the classroom channel.
    await ctx.runAction(internal.stream.addMemberToChannel, {
      channelId: cls.streamChannelId,
      streamUserId: student.streamUserId,
    });

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: orgId,
      actorId: adminUser._id,
      action: "student_added_to_class",
      targetId: args.studentId,
      targetType: "user",
      metadata: JSON.stringify({
        classId: args.classId,
        className: cls.name,
      }),
    });

    return null;
  },
});

export const adminAssignTeacherToClass = action({
  args: { classId: v.id("classes"), teacherId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { adminUser, orgId } = await requireAdminOrg(ctx);

    const cls = await ctx.runQuery(internal.classes.getClassByIdInternal, {
      classId: args.classId,
    });
    if (!cls) throw new Error("Class not found");
    if (cls.isArchived) throw new Error("This class is archived");
    if (cls.organizationId !== orgId) {
      throw new Error("Class not in admin organization");
    }

    const previousTeacher = await ctx.runQuery(internal.users.getUserById, {
      userId: cls.teacherId,
    });
    if (!previousTeacher) throw new Error("Previous teacher not found");

    const nextTeacher = await ctx.runQuery(internal.users.getUserById, {
      userId: args.teacherId,
    });
    if (!nextTeacher) throw new Error("Teacher not found");
    if (!canBeClassTeacher(nextTeacher.role)) {
      throw new Error(
        "Class lead must be a teacher, co-teacher, or admin",
      );
    }
    const nextTeacherInOrg: boolean = await ctx.runQuery(
      internal.users.userMatchesOrgForAdmin,
      { userId: args.teacherId, organizationId: orgId },
    );
    if (!nextTeacherInOrg) {
      throw new Error("Teacher must belong to the same organization");
    }
    await ctx.runMutation(internal.users.setOrganizationIfUnset, {
      userId: args.teacherId,
      organizationId: orgId,
    });

    if (nextTeacher._id === cls.teacherId) {
      return null;
    }

    // Update Stream membership first, so the chat channel reflects the new teacher.
    await ctx.runAction(internal.stream.addMemberToChannel, {
      channelId: cls.streamChannelId,
      streamUserId: nextTeacher.streamUserId,
    });

    await ctx.runAction(internal.stream.removeMemberFromChannel, {
      channelId: cls.streamChannelId,
      streamUserId: previousTeacher.streamUserId,
    });

    await ctx.runMutation(internal.classes.setTeacherForClass, {
      classId: args.classId,
      teacherId: args.teacherId,
    });

    await ctx.runMutation(internal.auditLog.logAction, {
      organizationId: orgId,
      actorId: adminUser._id,
      action: "teacher_assigned_to_class",
      targetId: args.teacherId,
      targetType: "user",
      metadata: JSON.stringify({
        classId: args.classId,
        className: cls.name,
        fromTeacherId: cls.teacherId,
        toTeacherId: args.teacherId,
      }),
    });

    return null;
  },
});

export const insertClass = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    teacherId: v.id("users"),
    name: v.string(),
    subject: v.string(),
    gradeLevel: v.number(),
    streamChannelId: v.string(),
    joinCode: v.string(),
  },
  returns: v.id("classes"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("classes", {
      organizationId: args.organizationId,
      teacherId: args.teacherId,
      name: args.name,
      subject: args.subject,
      gradeLevel: args.gradeLevel,
      streamChannelId: args.streamChannelId,
      joinCode: args.joinCode,
      isArchived: false,
      createdAt: Date.now(),
    });
  },
});

export const getClassesByTeacher = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      teacherDisplayName: v.optional(v.string()),
      teacherAvatarUrl: v.optional(v.string()),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      streamChannelId: v.string(),
      joinCode: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
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

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();

    const active = classes.filter((c) => !c.isArchived);

    return active.map((cls) => ({
      ...cls,
      teacherDisplayName: user.displayName,
      teacherAvatarUrl: user.avatarUrl,
    }));
  },
});

export const getClassesByStudent = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      teacherDisplayName: v.optional(v.string()),
      teacherAvatarUrl: v.optional(v.string()),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      streamChannelId: v.string(),
      joinCode: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
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

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const classes = await Promise.all(
      enrollments.map(async (enrollment) => {
        const cls = await ctx.db.get(enrollment.classId);
        if (cls && !cls.isArchived) {
          const teacher = await ctx.db.get(cls.teacherId);
          return {
            ...cls,
            teacherDisplayName: teacher?.displayName,
            teacherAvatarUrl: teacher?.avatarUrl,
          };
        }
        return null;
      })
    );

    return classes.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

export const getClassById = query({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      teacher: v.optional(
        v.object({
          displayName: v.string(),
          avatarUrl: v.optional(v.string()),
        })
      ),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      streamChannelId: v.string(),
      joinCode: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
      enrollmentCount: v.number(),
    }),
    v.null()
  ),
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      return null;
    }

    const isTeacher = cls.teacherId === user._id;
    const isEnrolled = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", user._id)
      )
      .unique();

    const isAdmin = user.role === "admin";
    if (!isTeacher && !isEnrolled && !isAdmin) {
      throw new Error("Not authorized to view this class");
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();
    const enrollmentCount = enrollments.filter((e) => e.status === "active").length;

    const teacher = await ctx.db.get(cls.teacherId);
    return {
      ...cls,
      enrollmentCount,
      teacher: teacher
        ? {
            displayName: teacher.displayName,
            avatarUrl: teacher.avatarUrl,
          }
        : undefined,
    };
  },
});

/** Roster + metadata for the class detail page (class teacher or org admin only). */
export const getClassManagementDetail = query({
  args: { classId: v.id("classes") },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      streamChannelId: v.string(),
      joinCode: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
      enrollmentCount: v.number(),
      teacher: v.object({
        _id: v.id("users"),
        displayName: v.string(),
        username: v.string(),
        avatarUrl: v.optional(v.string()),
      }),
      students: v.array(
        v.object({
          studentId: v.id("users"),
          displayName: v.string(),
          username: v.string(),
          enrolledAt: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      return null;
    }

    const isTeacher = cls.teacherId === user._id;
    const isOrgAdmin =
      user.role === "admin" &&
      !!user.organizationId &&
      user.organizationId === cls.organizationId;

    if (!isTeacher && !isOrgAdmin) {
      throw new Error("Not authorized to view class details");
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    const active = enrollments.filter((e) => e.status === "active");

    const students: Array<{
      studentId: Id<"users">;
      displayName: string;
      username: string;
      enrolledAt: number;
    }> = [];

    for (const e of active) {
      const s = await ctx.db.get(e.studentId);
      if (s) {
        students.push({
          studentId: s._id,
          displayName: s.displayName,
          username: s.username,
          enrolledAt: e.enrolledAt,
        });
      }
    }
    students.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const teacher = await ctx.db.get(cls.teacherId);
    if (!teacher) {
      throw new Error("Teacher not found");
    }

    return {
      _id: cls._id,
      _creationTime: cls._creationTime,
      organizationId: cls.organizationId,
      teacherId: cls.teacherId,
      name: cls.name,
      subject: cls.subject,
      gradeLevel: cls.gradeLevel,
      streamChannelId: cls.streamChannelId,
      joinCode: cls.joinCode,
      isArchived: cls.isArchived,
      createdAt: cls.createdAt,
      enrollmentCount: active.length,
      teacher: {
        _id: teacher._id,
        displayName: teacher.displayName,
        username: teacher.username,
        avatarUrl: teacher.avatarUrl,
      },
      students,
    };
  },
});

type EnrollmentResult = { success: boolean; classId?: Id<"classes"> };

export const enrollByJoinCode = action({
  args: { joinCode: v.string() },
  returns: v.object({ success: v.boolean(), classId: v.optional(v.id("classes")) }),
  handler: async (ctx, args): Promise<EnrollmentResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user: {
      _id: Id<"users">;
      role?: string;
      streamUserId: string;
    } | null = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.role || user.role !== "student") {
      throw new Error("Only students can enroll in classes");
    }

    const cls: {
      _id: Id<"classes">;
      isArchived: boolean;
      streamChannelId: string;
    } | null = await ctx.runQuery(internal.classes.getClassByJoinCode, {
      joinCode: args.joinCode,
    });

    if (!cls) {
      throw new Error("Invalid join code");
    }

    if (cls.isArchived) {
      throw new Error("This class is no longer active");
    }

    await ctx.runMutation(internal.classes.upsertEnrollment, {
      classId: cls._id,
      studentId: user._id,
    });

    await ctx.runAction(internal.stream.addMemberToChannel, {
      channelId: cls.streamChannelId,
      streamUserId: user.streamUserId,
    });

    return { success: true, classId: cls._id };
  },
});

export const getClassByJoinCode = internalQuery({
  args: { joinCode: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      teacherId: v.id("users"),
      name: v.string(),
      subject: v.string(),
      gradeLevel: v.number(),
      streamChannelId: v.string(),
      joinCode: v.string(),
      isArchived: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_join_code", (q) => q.eq("joinCode", args.joinCode))
      .unique();
  },
});

export const upsertEnrollment = internalMutation({
  args: {
    classId: v.id("classes"),
    studentId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingEnrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_and_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .unique();

    if (existingEnrollment) {
      if (existingEnrollment.status !== "active") {
        await ctx.db.patch(existingEnrollment._id, { status: "active" });
      }
    } else {
      await ctx.db.insert("enrollments", {
        classId: args.classId,
        studentId: args.studentId,
        enrolledAt: Date.now(),
        status: "active",
      });
    }
    return null;
  },
});

export const archiveClass = mutation({
  args: { classId: v.id("classes") },
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

    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Only the teacher or an admin can archive a class");
    }

    await ctx.db.patch(args.classId, { isArchived: true });
    return null;
  },
});
