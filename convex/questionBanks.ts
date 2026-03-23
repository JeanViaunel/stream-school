import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { usernameFromIdentity } from "./authHelpers";
import { api } from "./_generated/api";

// Helper function to get random items from array
function getRandomItems<T>(items: T[], count: number): T[] {
  if (count >= items.length) return [...items];
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Query to get current user for internal use
export const getCurrentUserInternal = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      username: v.string(),
      displayName: v.string(),
      organizationId: v.optional(v.id("organizations")),
      role: v.optional(v.union(
        v.literal("student"),
        v.literal("teacher"),
        v.literal("co_teacher"),
        v.literal("parent"),
        v.literal("admin")
      )),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameFromIdentity(identity)))
      .unique();

    if (!user) return null;

    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      organizationId: user.organizationId,
      role: user.role,
    };
  },
});

// Create a new question bank
export const createQuestionBank = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    gradeLevel: v.optional(v.number()),
  },
  returns: v.id("questionBanks"),
  handler: async (ctx, args): Promise<Id<"questionBanks">> => {
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

    if (!user.organizationId) {
      throw new Error("User must be in an organization");
    }

    // Check if user is a teacher or admin
    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers and admins can create question banks");
    }

    return await ctx.db.insert("questionBanks", {
      ...args,
      organizationId: user.organizationId,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

// Update question bank metadata
export const updateQuestionBank = mutation({
  args: {
    bankId: v.id("questionBanks"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    gradeLevel: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
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

    const bank = await ctx.db.get(args.bankId);
    if (!bank) {
      throw new Error("Question bank not found");
    }

    // Only creator or admin can update
    if (bank.createdBy !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to update this question bank");
    }

    const updateData: Partial<typeof bank> = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.subject !== undefined) updateData.subject = args.subject;
    if (args.gradeLevel !== undefined) updateData.gradeLevel = args.gradeLevel;

    await ctx.db.patch(args.bankId, updateData);
    return null;
  },
});

// Delete a question bank and all its items
export const deleteQuestionBank = mutation({
  args: {
    bankId: v.id("questionBanks"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
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

    const bank = await ctx.db.get(args.bankId);
    if (!bank) {
      throw new Error("Question bank not found");
    }

    // Only creator or admin can delete
    if (bank.createdBy !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to delete this question bank");
    }

    // Delete all items in the bank
    const items = await ctx.db
      .query("questionBankItems")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.bankId);
    return null;
  },
});

// Add a question to a bank
export const addQuestionToBank = mutation({
  args: {
    bankId: v.id("questionBanks"),
    question: v.object({
      text: v.string(),
      type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
      options: v.optional(v.array(v.string())),
      correctOption: v.optional(v.number()),
      explanation: v.optional(v.string()),
      difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
      tags: v.optional(v.array(v.string())),
    }),
  },
  returns: v.id("questionBankItems"),
  handler: async (ctx, args): Promise<Id<"questionBankItems">> => {
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

    const bank = await ctx.db.get(args.bankId);
    if (!bank) {
      throw new Error("Question bank not found");
    }

    // Only creator or admin can add questions
    if (bank.createdBy !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to add questions to this bank");
    }

    // Validate question data
    if (args.question.type === "multiple_choice") {
      if (!args.question.options || args.question.options.length < 2) {
        throw new Error("Multiple choice questions must have at least 2 options");
      }
      if (args.question.correctOption === undefined) {
        throw new Error("Multiple choice questions must have a correct answer");
      }
      if (args.question.correctOption >= (args.question.options?.length || 0)) {
        throw new Error("Correct option index is out of range");
      }
    }

    return await ctx.db.insert("questionBankItems", {
      bankId: args.bankId,
      question: {
        ...args.question,
        id: crypto.randomUUID(),
      },
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

// Update a question in a bank
export const updateQuestionInBank = mutation({
  args: {
    itemId: v.id("questionBankItems"),
    question: v.object({
      text: v.optional(v.string()),
      type: v.optional(v.union(v.literal("multiple_choice"), v.literal("short_answer"))),
      options: v.optional(v.array(v.string())),
      correctOption: v.optional(v.number()),
      explanation: v.optional(v.string()),
      difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
      tags: v.optional(v.array(v.string())),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
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

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Question not found");
    }

    const bank = await ctx.db.get(item.bankId);
    if (!bank) {
      throw new Error("Question bank not found");
    }

    // Only creator or admin can update questions
    if (bank.createdBy !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to update questions in this bank");
    }

    // Build updated question object
    const updatedQuestion = { ...item.question };
    if (args.question.text !== undefined) updatedQuestion.text = args.question.text;
    if (args.question.type !== undefined) updatedQuestion.type = args.question.type;
    if (args.question.options !== undefined) updatedQuestion.options = args.question.options;
    if (args.question.correctOption !== undefined) updatedQuestion.correctOption = args.question.correctOption;
    if (args.question.explanation !== undefined) updatedQuestion.explanation = args.question.explanation;
    if (args.question.difficulty !== undefined) updatedQuestion.difficulty = args.question.difficulty;
    if (args.question.tags !== undefined) updatedQuestion.tags = args.question.tags;

    // Validate updated question
    if (updatedQuestion.type === "multiple_choice") {
      if (!updatedQuestion.options || updatedQuestion.options.length < 2) {
        throw new Error("Multiple choice questions must have at least 2 options");
      }
      if (updatedQuestion.correctOption === undefined) {
        throw new Error("Multiple choice questions must have a correct answer");
      }
      if (updatedQuestion.correctOption >= (updatedQuestion.options?.length || 0)) {
        throw new Error("Correct option index is out of range");
      }
    }

    await ctx.db.patch(args.itemId, { question: updatedQuestion });
    return null;
  },
});

// Delete a question from a bank
export const deleteQuestionFromBank = mutation({
  args: {
    itemId: v.id("questionBankItems"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
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

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Question not found");
    }

    const bank = await ctx.db.get(item.bankId);
    if (!bank) {
      throw new Error("Question bank not found");
    }

    // Only creator or admin can delete questions
    if (bank.createdBy !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to delete questions from this bank");
    }

    await ctx.db.delete(args.itemId);
    return null;
  },
});

// Get all question banks for an organization
export const getQuestionBanks = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("questionBanks"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      name: v.string(),
      description: v.optional(v.string()),
      subject: v.optional(v.string()),
      gradeLevel: v.optional(v.number()),
      createdBy: v.id("users"),
      createdAt: v.number(),
      questionCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const banks = await ctx.db
      .query("questionBanks")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();

    // Get question count for each bank
    const banksWithCount = await Promise.all(
      banks.map(async (bank) => {
        const items = await ctx.db
          .query("questionBankItems")
          .withIndex("by_bank", (q) => q.eq("bankId", bank._id))
          .collect();

        return {
          ...bank,
          questionCount: items.length,
        };
      })
    );

    return banksWithCount;
  },
});

// Get a single question bank by ID
export const getQuestionBankById = query({
  args: {
    bankId: v.id("questionBanks"),
  },
  returns: v.union(
    v.object({
      _id: v.id("questionBanks"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      name: v.string(),
      description: v.optional(v.string()),
      subject: v.optional(v.string()),
      gradeLevel: v.optional(v.number()),
      createdBy: v.id("users"),
      createdAt: v.number(),
      questionCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const bank = await ctx.db.get(args.bankId);
    if (!bank) return null;

    const items = await ctx.db
      .query("questionBankItems")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .collect();

    return {
      ...bank,
      questionCount: items.length,
    };
  },
});

// Get all questions in a bank
export const getQuestionBankItems = query({
  args: {
    bankId: v.id("questionBanks"),
  },
  returns: v.array(
    v.object({
      _id: v.id("questionBankItems"),
      _creationTime: v.number(),
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
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("questionBankItems")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .order("desc")
      .collect();

    return items;
  },
});

// Search question banks by subject, grade, or tags
export const searchQuestionBanks = query({
  args: {
    organizationId: v.id("organizations"),
    subject: v.optional(v.string()),
    gradeLevel: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    searchQuery: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("questionBanks"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      name: v.string(),
      description: v.optional(v.string()),
      subject: v.optional(v.string()),
      gradeLevel: v.optional(v.number()),
      createdBy: v.id("users"),
      createdAt: v.number(),
      questionCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let banks = await ctx.db
      .query("questionBanks")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Filter by subject
    if (args.subject) {
      banks = banks.filter((b) => b.subject?.toLowerCase() === args.subject?.toLowerCase());
    }

    // Filter by grade level
    if (args.gradeLevel !== undefined) {
      banks = banks.filter((b) => b.gradeLevel === args.gradeLevel);
    }

    // Filter by search query (name and description)
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      banks = banks.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.description?.toLowerCase().includes(query)
      );
    }

    // If tags are specified, filter banks that have questions with those tags
    if (args.tags && args.tags.length > 0) {
      const banksWithMatchingTags: typeof banks = [];
      
      for (const bank of banks) {
        const items = await ctx.db
          .query("questionBankItems")
          .withIndex("by_bank", (q) => q.eq("bankId", bank._id))
          .collect();

        const hasMatchingTag = items.some((item) =>
          item.question.tags?.some((tag) =>
            args.tags?.some((searchTag) => tag.toLowerCase() === searchTag.toLowerCase())
          )
        );

        if (hasMatchingTag) {
          banksWithMatchingTags.push(bank);
        }
      }

      banks = banksWithMatchingTags;
    }

    // Get question count for each bank
    const banksWithCount = await Promise.all(
      banks.map(async (bank) => {
        const items = await ctx.db
          .query("questionBankItems")
          .withIndex("by_bank", (q) => q.eq("bankId", bank._id))
          .collect();

        return {
          ...bank,
          questionCount: items.length,
        };
      })
    );

    return banksWithCount;
  },
});

// Generate an assignment from selected questions in a bank
export const generateAssignmentFromBank = mutation({
  args: {
    bankId: v.id("questionBanks"),
    classId: v.id("classes"),
    title: v.string(),
    instructions: v.optional(v.string()),
    questionCount: v.number(),
    difficultyDistribution: v.optional(v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    })),
    selectedQuestionIds: v.optional(v.array(v.string())),
    dueDateAt: v.optional(v.number()),
  },
  returns: v.id("assignments"),
  handler: async (ctx, args): Promise<Id<"assignments">> => {
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

    // Verify teacher owns the class
    const cls = await ctx.db.get(args.classId);
    if (!cls) {
      throw new Error("Class not found");
    }

    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Only the class teacher can create assignments");
    }

    // Get the question bank
    const bank = await ctx.db.get(args.bankId);
    if (!bank) {
      throw new Error("Question bank not found");
    }

    // Get all items in the bank
    const bankItems = await ctx.db
      .query("questionBankItems")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .collect();

    if (bankItems.length === 0) {
      throw new Error("Question bank is empty");
    }

    let selectedItems: typeof bankItems;

    // If specific question IDs are provided, use those
    if (args.selectedQuestionIds && args.selectedQuestionIds.length > 0) {
      selectedItems = bankItems.filter((item) =>
        args.selectedQuestionIds?.includes(item.question.id)
      );
      
      if (selectedItems.length === 0) {
        throw new Error("No valid questions selected");
      }
    } else if (args.difficultyDistribution) {
      // Select questions based on difficulty distribution
      const { easy, medium, hard } = args.difficultyDistribution;
      const totalRequested = easy + medium + hard;

      if (totalRequested !== args.questionCount) {
        throw new Error("Difficulty distribution must match question count");
      }

      const easyItems = bankItems.filter((i) => i.question.difficulty === "easy");
      const mediumItems = bankItems.filter((i) => i.question.difficulty === "medium");
      const hardItems = bankItems.filter((i) => i.question.difficulty === "hard");

      if (easyItems.length < easy || mediumItems.length < medium || hardItems.length < hard) {
        throw new Error("Not enough questions with specified difficulty levels");
      }

      selectedItems = [
        ...getRandomItems(easyItems, easy),
        ...getRandomItems(mediumItems, medium),
        ...getRandomItems(hardItems, hard),
      ];
    } else {
      // Random selection
      if (bankItems.length < args.questionCount) {
        throw new Error("Not enough questions in bank");
      }
      selectedItems = getRandomItems(bankItems, args.questionCount);
    }

    // Update usage count for selected questions
    for (const item of selectedItems) {
      await ctx.db.patch(item._id, {
        usageCount: item.usageCount + 1,
      });
    }

    // Create the assignment
    const assignmentId = await ctx.db.insert("assignments", {
      classId: args.classId,
      creatorId: user._id,
      title: args.title || `Quiz from ${bank.name}`,
      instructions: args.instructions || "",
      type: "multiple_choice",
      questions: selectedItems.map((item) => ({
        id: item.question.id,
        text: item.question.text,
        options: item.question.options,
        correctOption: item.question.correctOption,
      })),
      dueDateAt: args.dueDateAt,
      isPublished: false,
      createdAt: Date.now(),
    });

    return assignmentId;
  },
});

// Get available tags across all question banks in an organization
export const getAvailableTags = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const banks = await ctx.db
      .query("questionBanks")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const tags = new Set<string>();

    for (const bank of banks) {
      const items = await ctx.db
        .query("questionBankItems")
        .withIndex("by_bank", (q) => q.eq("bankId", bank._id))
        .collect();

      for (const item of items) {
        item.question.tags?.forEach((tag) => tags.add(tag));
      }
    }

    return Array.from(tags).sort();
  },
});

// Get available subjects across all question banks in an organization
export const getAvailableSubjects = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const banks = await ctx.db
      .query("questionBanks")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const subjects = new Set<string>();
    banks.forEach((bank) => {
      if (bank.subject) {
        subjects.add(bank.subject);
      }
    });

    return Array.from(subjects).sort();
  },
});

// Get usage analytics for a question bank
export const getQuestionBankAnalytics = query({
  args: {
    bankId: v.id("questionBanks"),
  },
  returns: v.object({
    totalQuestions: v.number(),
    questionsByDifficulty: v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
      unspecified: v.number(),
    }),
    questionsByType: v.object({
      multipleChoice: v.number(),
      shortAnswer: v.number(),
    }),
    totalUsageCount: v.number(),
    mostUsedQuestions: v.array(v.object({
      questionId: v.string(),
      text: v.string(),
      usageCount: v.number(),
    })),
    allTags: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("questionBankItems")
      .withIndex("by_bank", (q) => q.eq("bankId", args.bankId))
      .collect();

    const totalQuestions = items.length;
    
    const questionsByDifficulty = {
      easy: items.filter((i) => i.question.difficulty === "easy").length,
      medium: items.filter((i) => i.question.difficulty === "medium").length,
      hard: items.filter((i) => i.question.difficulty === "hard").length,
      unspecified: items.filter((i) => !i.question.difficulty).length,
    };

    const questionsByType = {
      multipleChoice: items.filter((i) => i.question.type === "multiple_choice").length,
      shortAnswer: items.filter((i) => i.question.type === "short_answer").length,
    };

    const totalUsageCount = items.reduce((sum, i) => sum + i.usageCount, 0);

    const mostUsedQuestions = items
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map((i) => ({
        questionId: i.question.id,
        text: i.question.text.substring(0, 100) + (i.question.text.length > 100 ? "..." : ""),
        usageCount: i.usageCount,
      }));

    const allTags = new Set<string>();
    items.forEach((item) => {
      item.question.tags?.forEach((tag) => allTags.add(tag));
    });

    return {
      totalQuestions,
      questionsByDifficulty,
      questionsByType,
      totalUsageCount,
      mostUsedQuestions,
      allTags: Array.from(allTags).sort(),
    };
  },
});
