import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";

export const createClass = action({
  args: {
    name: v.string(),
    subject: v.string(),
    gradeLevel: v.number(),
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

    if (!user.role || (user.role !== "teacher" && user.role !== "school_admin" && user.role !== "platform_admin")) {
      throw new Error("Only teachers can create classes");
    }

    if (!user.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const joinCode = Array.from({ length: 6 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))
    ).join("");

    const streamChannelId = `class_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    await ctx.runAction(internal.stream.createClassChannel, {
      channelId: streamChannelId,
      name: args.name,
      teacherStreamUserId: user.streamUserId,
    });

    const classId: Id<"classes"> = await ctx.runMutation(internal.classes.insertClass, {
      organizationId: user.organizationId,
      teacherId: user._id,
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
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    return classes.map((cls) => ({
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

    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to view this class");
    }

    const teacher = await ctx.db.get(cls.teacherId);
    return {
      ...cls,
      teacher: teacher
        ? {
            displayName: teacher.displayName,
            avatarUrl: teacher.avatarUrl,
          }
        : undefined,
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

    if (cls.teacherId !== user._id && user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new Error("Only the teacher or an admin can archive a class");
    }

    await ctx.db.patch(args.classId, { isArchived: true });
    return null;
  },
});
