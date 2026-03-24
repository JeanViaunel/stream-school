import {
  action,
  query,
  type ActionCtx,
  type QueryCtx,
  internalAction
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { type Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";
import { usernameFromIdentity } from "./authHelpers";

const userRoleReturn = v.union(
  v.literal("student"),
  v.literal("teacher"),
  v.literal("co_teacher"),
  v.literal("parent"),
  v.literal("admin")
);

const parentalConsentStatusReturn = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("not_required")
);

type AuthResult = {
  userId: Id<"users">;
  displayName: string;
  streamUserId: string;
  token: string;
  /** RS256 JWT for Convex `ctx.auth` (not the Stream token). */
  convexAuthToken: string;
  role: "student" | "teacher" | "co_teacher" | "parent" | "admin";
  organizationId: Id<"organizations"> | undefined;
  gradeLevel: number | undefined;
};

export const register = action({
  args: {
    username: v.string(),
    password: v.string(),
    displayName: v.string(),
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number())
  },
  returns: v.object({
    userId: v.id("users"),
    displayName: v.string(),
    streamUserId: v.string(),
    token: v.string(),
    convexAuthToken: v.string(),
    role: userRoleReturn,
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number())
  }),
  handler: async (
    ctx: ActionCtx,
    args: {
      username: string;
      password: string;
      displayName: string;
      organizationId?: Id<"organizations">;
      gradeLevel?: number;
    }
  ): Promise<AuthResult> => {
    const passwordHash: string = await bcrypt.hash(args.password, 10);
    const streamUserId: string = `user_${args.username}`;

    const organizationId: Id<"organizations"> =
      args.organizationId ?? (await getDefaultOrgId(ctx));
    const role = "student" as const;

    const userId: Id<"users"> = await ctx.runMutation(
      internal.users.createUser,
      {
        username: args.username,
        passwordHash,
        displayName: args.displayName,
        streamUserId,
        role,
        organizationId,
        gradeLevel: args.gradeLevel,
        isActive: true
      }
    );
    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: streamUserId
    });

    await ctx.runAction(internal.stream.upsertStreamUser, {
      userId: streamUserId,
      displayName: args.displayName
    });

    const convexAuthToken: string = await ctx.runAction(
      internal.convexJwt.signConvexAuthToken,
      {
        username: args.username
      }
    );

    return {
      userId,
      displayName: args.displayName,
      streamUserId,
      token,
      convexAuthToken,
      role,
      organizationId,
      gradeLevel: args.gradeLevel
    };
  }
});

async function getDefaultOrgId(ctx: ActionCtx): Promise<Id<"organizations">> {
  const org = await ctx.runQuery(api.organizations.getBySlug, {
    slug: "default"
  });
  if (org) {
    return org._id;
  }
  return await ctx.runMutation(internal.organizations.createOrganization, {
    name: "Default Organization",
    slug: "default",
    settings: {
      studentDmsEnabled: false,
      recordingEnabled: false,
      lobbyEnabled: true,
      maxClassSize: 30,
      dataRetentionDays: 365
    }
  });
}

export const login = action({
  args: {
    username: v.string(),
    password: v.string()
  },
  returns: v.object({
    userId: v.id("users"),
    displayName: v.string(),
    streamUserId: v.string(),
    token: v.string(),
    convexAuthToken: v.string(),
    role: userRoleReturn,
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number())
  }),
  handler: async (
    ctx: ActionCtx,
    args: { username: string; password: string }
  ): Promise<AuthResult> => {
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: args.username
    });
    if (user === null) throw new Error("Invalid username or password");

    const valid: boolean = await bcrypt.compare(
      args.password,
      user.passwordHash
    );
    if (!valid) throw new Error("Invalid username or password");

    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: user.streamUserId
    });

    const role =
      user.role ??
      ("student" as "student" | "teacher" | "co_teacher" | "parent" | "admin");

    const convexAuthToken: string = await ctx.runAction(
      internal.convexJwt.signConvexAuthToken,
      {
        username: user.username
      }
    );

    return {
      userId: user._id,
      displayName: user.displayName,
      streamUserId: user.streamUserId,
      token,
      convexAuthToken,
      role,
      organizationId: user.organizationId,
      gradeLevel: user.gradeLevel
    };
  }
});

export const refreshToken = action({
  args: { streamUserId: v.string() },
  returns: v.string(),
  handler: async (
    ctx: ActionCtx,
    args: { streamUserId: string }
  ): Promise<string> => {
    const token: string = await ctx.runAction(internal.stream.generateToken, {
      userId: args.streamUserId
    });
    return token;
  }
});

export const refreshMyToken = action({
  args: {},
  returns: v.string(),
  handler: async (ctx: ActionCtx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity)
    });
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.runAction(internal.stream.generateToken, {
      userId: user.streamUserId
    });
  }
});

export const getMe = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      username: v.string(),
      displayName: v.string(),
      streamUserId: v.string(),
      createdAt: v.number(),
      parentalConsentStatus: v.optional(parentalConsentStatusReturn),
      consentVerifiedAt: v.optional(v.number())
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx, args: { userId: Id<"users"> }) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      streamUserId: user.streamUserId,
      createdAt: user.createdAt,
      parentalConsentStatus: user.parentalConsentStatus,
      consentVerifiedAt: user.consentVerifiedAt
    };
  }
});

// COPPA Compliance - Helper function to calculate age from birthDate
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// COPPA Compliance - Generate unique consent token
function generateConsentToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// COPPA Compliance - Register student with parental consent check
export const registerStudent = action({
  args: {
    username: v.string(),
    password: v.string(),
    displayName: v.string(),
    birthDate: v.string(), // Format: YYYY-MM-DD
    parentEmail: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number())
  },
  returns: v.object({
    userId: v.id("users"),
    displayName: v.string(),
    streamUserId: v.string(),
    token: v.string(),
    convexAuthToken: v.string(),
    role: userRoleReturn,
    organizationId: v.optional(v.id("organizations")),
    gradeLevel: v.optional(v.number()),
    parentalConsentStatus: parentalConsentStatusReturn,
    requiresParentalConsent: v.boolean(),
    consentToken: v.optional(v.string())
  }),
  handler: async (
    ctx: ActionCtx,
    args: {
      username: string;
      password: string;
      displayName: string;
      birthDate: string;
      parentEmail?: string;
      organizationId?: Id<"organizations">;
      gradeLevel?: number;
    }
  ) => {
    const passwordHash: string = await bcrypt.hash(args.password, 10);
    const streamUserId: string = `user_${args.username}`;
    const organizationId: Id<"organizations"> =
      args.organizationId ?? (await getDefaultOrgId(ctx));

    // COPPA Check: Calculate age
    const age = calculateAge(args.birthDate);
    const isUnder13 = age < 13;

    // Determine consent status
    let parentalConsentStatus: "pending" | "approved" | "not_required";
    let consentToken: string | undefined;

    if (isUnder13) {
      // Under 13 requires parental consent
      if (!args.parentEmail) {
        throw new Error(
          "Parent email is required for users under 13 years old (COPPA compliance)"
        );
      }
      parentalConsentStatus = "pending";
      consentToken = generateConsentToken();

      // TODO: Send consent email to parent
      // This would typically be done via an internal action
      await ctx.runAction(internal.auth.sendConsentEmail, {
        parentEmail: args.parentEmail,
        consentToken,
        studentUsername: args.username,
        studentDisplayName: args.displayName
      });
    } else {
      // 13 or older, no consent required
      parentalConsentStatus = "not_required";
    }

    const role = "student" as const;

    const userId: Id<"users"> = await ctx.runMutation(
      internal.users.createUser,
      {
        username: args.username,
        passwordHash,
        displayName: args.displayName,
        streamUserId,
        role,
        organizationId,
        gradeLevel: args.gradeLevel,
        birthDate: args.birthDate,
        parentEmail: args.parentEmail,
        parentalConsentStatus,
        consentToken,
        isActive: !isUnder13 // If under 13, account is inactive until consent
      }
    );

    // Only generate token and create Stream user if consent is not required or approved
    let token = "";
    let convexAuthToken = "";

    if (parentalConsentStatus !== "pending") {
      token = await ctx.runAction(internal.stream.generateToken, {
        userId: streamUserId
      });

      await ctx.runAction(internal.stream.upsertStreamUser, {
        userId: streamUserId,
        displayName: args.displayName
      });

      convexAuthToken = await ctx.runAction(
        internal.convexJwt.signConvexAuthToken,
        {
          username: args.username
        }
      );
    }

    return {
      userId,
      displayName: args.displayName,
      streamUserId,
      token,
      convexAuthToken,
      role,
      organizationId,
      gradeLevel: args.gradeLevel,
      parentalConsentStatus,
      requiresParentalConsent: isUnder13,
      consentToken
    };
  }
});

type VerifyParentalConsentResult = {
  success: boolean;
  message: string;
  userId?: Id<"users">;
};

// COPPA Compliance - Verify parental consent
export const verifyParentalConsent = action({
  args: {
    consentToken: v.string()
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    userId: v.optional(v.id("users"))
  }),
  handler: async (
    ctx: ActionCtx,
    args: { consentToken: string }
  ): Promise<VerifyParentalConsentResult> => {
    // Find user by consent token
    const user = await ctx.runQuery(internal.users.getUserByConsentToken, {
      consentToken: args.consentToken
    });

    if (!user) {
      return {
        success: false,
        message: "Invalid or expired consent token"
      };
    }

    if (user.parentalConsentStatus === "approved") {
      return {
        success: true,
        message: "Parental consent has already been verified",
        userId: user._id
      };
    }

    if (user.parentalConsentStatus !== "pending") {
      return {
        success: false,
        message: "Invalid consent status"
      };
    }

    // Update user with approved consent
    await ctx.runMutation(internal.users.updateParentalConsent, {
      userId: user._id,
      parentalConsentStatus: "approved",
      consentVerifiedAt: Date.now()
    });

    // Activate Stream user and generate tokens
    await ctx.runAction(internal.stream.upsertStreamUser, {
      userId: user.streamUserId,
      displayName: user.displayName
    });

    // Create audit log
    await ctx.runMutation(internal.auditLog.createAuditLog, {
      organizationId: user.organizationId!,
      actorId: user._id,
      action: "parental_consent_verified",
      targetId: user._id,
      targetType: "user",
      metadata: JSON.stringify({
        parentEmail: user.parentEmail,
        verifiedAt: Date.now()
      })
    });

    return {
      success: true,
      message:
        "Parental consent verified successfully. The student can now log in.",
      userId: user._id
    };
  }
});

// COPPA Compliance - Internal action to send consent email
export const sendConsentEmail = internalAction({
  args: {
    parentEmail: v.string(),
    consentToken: v.string(),
    studentUsername: v.string(),
    studentDisplayName: v.string()
  },
  returns: v.boolean(),
  handler: async (
    ctx: ActionCtx,
    args: {
      parentEmail: string;
      consentToken: string;
      studentUsername: string;
      studentDisplayName: string;
    }
  ): Promise<boolean> => {
    // In a production environment, integrate with email service
    // Examples: SendGrid, AWS SES, Resend, etc.
    console.log(`[COPPA] Sending consent email to ${args.parentEmail}`);
    console.log(`[COPPA] Consent token: ${args.consentToken}`);
    console.log(
      `[COPPA] Student: ${args.studentDisplayName} (${args.studentUsername})`
    );

    // TODO: Implement actual email sending
    // const consentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/consent/verify?token=${args.consentToken}`;

    return true;
  }
});

type CheckLoginEligibilityResult = {
  canLogin: boolean;
  parentalConsentStatus?: "pending" | "approved" | "not_required";
  message?: string;
};

// COPPA Compliance - Check if user can login (consent must be approved)
export const checkLoginEligibility = query({
  args: { username: v.string() },
  returns: v.object({
    canLogin: v.boolean(),
    parentalConsentStatus: v.optional(parentalConsentStatusReturn),
    message: v.optional(v.string())
  }),
  handler: async (
    ctx: QueryCtx,
    args: { username: string }
  ): Promise<CheckLoginEligibilityResult> => {
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: args.username
    });

    if (!user) {
      return {
        canLogin: false,
        message: "User not found"
      };
    }

    // Check if parental consent is required but not yet approved
    if (user.parentalConsentStatus === "pending") {
      return {
        canLogin: false,
        parentalConsentStatus: "pending",
        message:
          "Parental consent is pending. Please ask your parent to check their email and verify consent."
      };
    }

    return {
      canLogin: true,
      parentalConsentStatus: user.parentalConsentStatus
    };
  }
});
