import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { usernameFromIdentity } from "./authHelpers";

// Initialize OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

async function callOpenAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json() as OpenAIResponse;
  return data.choices[0]?.message?.content || "I couldn't generate a response at this time.";
}

// AI Tutor - Student asks questions and gets AI-generated answers
export const askAITutor = action({
  args: {
    question: v.string(),
    classId: v.id("classes"),
    context: v.optional(v.string()),
  },
  returns: v.object({
    answer: v.string(),
    suggestions: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });
    if (!user) throw new Error("User not found");
    
    // Get class context
    const cls = await ctx.runQuery(internal.aiInternal.getClassById, {
      classId: args.classId,
    });
    if (!cls) throw new Error("Class not found");
    
    // Verify user is enrolled or teaching this class
    const isTeacher = cls.teacherId === user._id;
    const { isEnrolled } = await ctx.runQuery(internal.aiInternal.checkEnrollment, {
      classId: args.classId,
      studentId: user._id,
    });
    
    if (!isTeacher && !isEnrolled) {
      throw new Error("Not authorized to use AI tutor for this class");
    }
    
    // Get class context from assignments
    const assignments = await ctx.runQuery(internal.aiInternal.getClassAssignments, {
      classId: args.classId,
      limit: 10,
    });
    
    const classContext = `Class: ${cls.name}, Subject: ${cls.subject}, Grade Level: ${cls.gradeLevel}. Recent topics: ${assignments.map((a: { title: string }) => a.title).join(", ")}`;
    
    // Track API usage for rate limiting
    await ctx.runMutation(internal.aiInternal.logAIUsage, {
      userId: user._id,
      classId: args.classId,
      feature: "tutor",
    });
    
    // Call OpenAI for answer
    const answer = await callOpenAI([
      {
        role: "system",
        content: `You are a helpful, encouraging tutor for a ${cls.subject} class for grade ${cls.gradeLevel} students. Be clear, concise, and explain concepts in an age-appropriate way. Keep responses to a maximum of 3 paragraphs.`,
      },
      {
        role: "user",
        content: `Context: ${classContext}${args.context ? `\nAdditional context: ${args.context}` : ""}\n\nStudent question: ${args.question}`,
      },
    ]);
    
    // Generate follow-up suggestions in a separate call
    const suggestionsResponse = await callOpenAI([
      {
        role: "system",
        content: "Generate 3 brief follow-up questions a student might ask about this topic. Return only the questions, one per line, no numbering.",
      },
      {
        role: "user",
        content: `Original question: ${args.question}\nAnswer: ${answer}`,
      },
    ]);
    
    const suggestions = suggestionsResponse
      .split("\n")
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.endsWith("?"))
      .slice(0, 3);
    
    return { answer, suggestions };
  },
});

// Auto-Summary - Generate summary of session chat
export const summarizeChat = action({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    summary: v.string(),
    keyPoints: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });
    if (!user) throw new Error("User not found");
    
    // Get session
    const session = await ctx.runQuery(internal.aiInternal.getSessionById, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("Session not found");
    
    // Get class to verify permissions
    const cls = await ctx.runQuery(internal.aiInternal.getClassById, {
      classId: session.classId,
    });
    if (!cls) throw new Error("Class not found");
    
    // Only teachers can generate summaries
    const isTeacher = cls.teacherId === user._id;
    const isAdmin = user.role === "admin" && user.organizationId === cls.organizationId;
    
    if (!isTeacher && !isAdmin) {
      throw new Error("Only teachers can generate session summaries");
    }
    
    // Track API usage
    await ctx.runMutation(internal.aiInternal.logAIUsage, {
      userId: user._id,
      classId: session.classId,
      sessionId: args.sessionId,
      feature: "summary",
    });
    
    // Fetch chat messages from Stream channel
    const messages = await ctx.runAction(internal.stream.getSessionChatMessages, {
      channelId: cls.streamChannelId,
    });
    
    if (!messages || messages.length === 0) {
      throw new Error("No chat messages found for this session");
    }
    
    const chatText = messages.map((m: any) => `${m.user}: ${m.text}`).join("\n");
    
    // Generate summary
    const summary = await callOpenAI([
      {
        role: "system",
        content: "Summarize this classroom chat session. Identify key topics discussed, questions asked, important announcements, and overall session flow. Be concise but comprehensive.",
      },
      {
        role: "user",
        content: chatText,
      },
    ]);
    
    // Extract key points
    const keyPointsResponse = await callOpenAI([
      {
        role: "system",
        content: "Extract 3-5 key points from this classroom session summary. Return as a simple list, one point per line.",
      },
      {
        role: "user",
        content: summary,
      },
    ]);
    
    const keyPoints = keyPointsResponse
      .split("\n")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 10)
      .slice(0, 5);
    
    // Save summary to session
    await ctx.runMutation(internal.sessions.addSummary, {
      sessionId: args.sessionId,
      summary,
      keyPoints,
    });
    
    return { summary, keyPoints };
  },
});

// Generate session summary (wrapper for triggering after session ends)
export const generateSessionSummary = action({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    success: v.boolean(),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Call summarizeChat directly
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");
      
      const user = await ctx.runQuery(internal.users.getUserByUsername, {
        username: usernameFromIdentity(identity),
      });
      if (!user) throw new Error("User not found");
      
      const session = await ctx.runQuery(internal.aiInternal.getSessionById, {
        sessionId: args.sessionId,
      });
      if (!session) throw new Error("Session not found");
      
      const cls = await ctx.runQuery(internal.aiInternal.getClassById, {
        classId: session.classId,
      });
      if (!cls) throw new Error("Class not found");
      
      const isTeacher = cls.teacherId === user._id;
      const isAdmin = user.role === "admin" && user.organizationId === cls.organizationId;
      
      if (!isTeacher && !isAdmin) {
        throw new Error("Only teachers can generate session summaries");
      }
      
      await ctx.runMutation(internal.aiInternal.logAIUsage, {
        userId: user._id,
        classId: session.classId,
        sessionId: args.sessionId,
        feature: "summary",
      });
      
      const messages = await ctx.runAction(internal.stream.getSessionChatMessages, {
        channelId: cls.streamChannelId,
      });
      
      if (!messages || messages.length === 0) {
        throw new Error("No chat messages found for this session");
      }
      
      const chatText = messages.map((m: any) => `${m.user}: ${m.text}`).join("\n");
      
      const summary = await callOpenAI([
        {
          role: "system",
          content: "Summarize this classroom chat session. Identify key topics discussed, questions asked, important announcements, and overall session flow. Be concise but comprehensive.",
        },
        {
          role: "user",
          content: chatText,
        },
      ]);
      
      const keyPointsResponse = await callOpenAI([
        {
          role: "system",
          content: "Extract 3-5 key points from this classroom session summary. Return as a simple list, one point per line.",
        },
        {
          role: "user",
          content: summary,
        },
      ]);
      
      const keyPoints = keyPointsResponse
        .split("\n")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 10)
        .slice(0, 5);
      
      await ctx.runMutation(internal.sessions.addSummary, {
        sessionId: args.sessionId,
        summary,
        keyPoints,
      });
      
      return {
        success: true,
        summary: summary,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Get AI usage stats for rate limiting
export const getAIUsageStats = action({
  args: {
    hours: v.optional(v.number()),
  },
  returns: v.object({
    totalRequests: v.number(),
    requestsByFeature: v.record(v.string(), v.number()),
    canMakeRequest: v.boolean(),
  }),
  handler: async (ctx, args): Promise<{ totalRequests: number; requestsByFeature: Record<string, number>; canMakeRequest: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });
    if (!user) throw new Error("User not found");
    
    const lookbackHours = args.hours || 24;
    const cutoffTime = Date.now() - (lookbackHours * 60 * 60 * 1000);
    
    const logs = await ctx.runQuery(internal.aiInternal.getAIUsageForUser, {
      userId: user._id,
      since: cutoffTime,
    });
    
    const requestsByFeature: Record<string, number> = {};
    logs.forEach((log: { feature: string }) => {
      requestsByFeature[log.feature] = (requestsByFeature[log.feature] || 0) + 1;
    });
    
    // Rate limit: 100 requests per 24 hours
    const totalRequests = logs.length;
    const canMakeRequest = totalRequests < 100;
    
    return {
      totalRequests,
      requestsByFeature,
      canMakeRequest,
    };
  },
});

// Smart scheduling suggestions
export const suggestOptimalSessionTimes = action({
  args: { classId: v.id("classes") },
  returns: v.array(v.object({
    day: v.string(),
    hour: v.number(),
    attendanceRate: v.number(),
    engagementScore: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });
    if (!user) throw new Error("User not found");
    
    const cls = await ctx.runQuery(internal.aiInternal.getClassById, {
      classId: args.classId,
    });
    if (!cls) throw new Error("Class not found");
    
    if (cls.teacherId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized");
    }
    
    // Get historical attendance data
    const sessions = await ctx.runQuery(internal.aiInternal.getClassSessions, {
      classId: args.classId,
    });
    
    const attendanceByTime: Record<string, { total: number; attended: number }> = {};
    
    for (const session of sessions) {
      const date = new Date(session.startedAt);
      const key = `${date.getDay()}-${date.getHours()}`;
      
      const logs = await ctx.runQuery(internal.aiInternal.getSessionLogs, {
        sessionId: session._id,
      });
      
      if (!attendanceByTime[key]) {
        attendanceByTime[key] = { total: 0, attended: 0 };
      }
      
      attendanceByTime[key].total += 1;
      attendanceByTime[key].attended += logs.length;
    }
    
    // Sort by attendance rate
    const suggestions = Object.entries(attendanceByTime)
      .map(([key, data]) => {
        const [day, hour] = key.split("-").map(Number);
        return {
          day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day],
          hour,
          attendanceRate: Math.round((data.attended / data.total) * 100),
          engagementScore: Math.round((data.attended / data.total) * 100),
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 5);
    
    return suggestions;
  },
});

// Study material recommendations
export const recommendStudyMaterials = action({
  args: { studentId: v.id("users"), classId: v.id("classes") },
  returns: v.array(v.object({
    title: v.string(),
    type: v.string(),
    reason: v.string(),
    priority: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const currentUser = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });
    if (!currentUser) throw new Error("User not found");
    
    // Only allow self or teacher/admin
    const cls = await ctx.runQuery(internal.aiInternal.getClassById, {
      classId: args.classId,
    });
    if (!cls) throw new Error("Class not found");
    
    const isSelf = currentUser._id === args.studentId;
    const isTeacher = cls.teacherId === currentUser._id;
    const isAdmin = currentUser.role === "admin";
    
    if (!isSelf && !isTeacher && !isAdmin) {
      throw new Error("Not authorized");
    }
    
    // Get weak areas based on grades
    const grades = await ctx.runQuery(internal.aiInternal.getStudentGrades, {
      studentId: args.studentId,
      classId: args.classId,
    });
    
    const recommendations: { title: string; type: string; reason: string; priority: number }[] = [];
    
    // Find assignments where student scored below 70%
    for (const grade of grades) {
      if ((grade.score / grade.maxScore) < 0.7) {
        const assignment = await ctx.runQuery(internal.aiInternal.getAssignmentById, {
          assignmentId: grade.assignmentId,
        });
        if (assignment) {
          recommendations.push({
            title: `Review: ${assignment.title}`,
            type: "assignment",
            reason: `Scored ${Math.round((grade.score / grade.maxScore) * 100)}% - below target`,
            priority: 1,
          });
        }
      }
    }
    
    // Add general recommendations based on class subject
    recommendations.push({
      title: `${cls.subject} Study Guide`,
      type: "resource",
      reason: "Recommended for this class",
      priority: 3,
    });
    
    // Add attendance recommendation if needed
    const sessions = await ctx.runQuery(internal.aiInternal.getClassSessions, {
      classId: args.classId,
    });
    
    const sessionLogs = await ctx.runQuery(internal.aiInternal.getUserSessionLogs, {
      userId: args.studentId,
    });
    
    const attendedSessions = sessionLogs.filter((l: { sessionId: Id<"sessions"> }) => 
      sessions.some((s: { _id: Id<"sessions"> }) => s._id === l.sessionId)
    );
    
    const attendanceRate = sessions.length > 0
      ? (attendedSessions.length / sessions.length)
      : 0;
    
    if (attendanceRate < 0.8) {
      recommendations.push({
        title: "Review Missed Session Content",
        type: "video",
        reason: "Attendance below 80%",
        priority: 2,
      });
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  },
});

// Grade prediction
export const predictStudentGrades = action({
  args: { studentId: v.id("users"), classId: v.id("classes") },
  returns: v.object({
    predictedGrade: v.number(),
    confidence: v.number(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    recommendations: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const currentUser = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });
    if (!currentUser) throw new Error("User not found");
    
    // Authorization
    const cls = await ctx.runQuery(internal.aiInternal.getClassById, {
      classId: args.classId,
    });
    if (!cls) throw new Error("Class not found");
    
    const isSelf = currentUser._id === args.studentId;
    const isTeacher = cls.teacherId === currentUser._id;
    const isAdmin = currentUser.role === "admin";
    const isParent = currentUser.role === "parent";
    
    if (isParent) {
      // Check parent link
      const { hasConsent } = await ctx.runQuery(internal.aiInternal.checkParentLink, {
        parentId: currentUser._id,
        studentId: args.studentId,
      });
      if (!hasConsent) throw new Error("Not authorized");
    } else if (!isSelf && !isTeacher && !isAdmin) {
      throw new Error("Not authorized");
    }
    
    // Get student's historical data
    const grades = await ctx.runQuery(internal.aiInternal.getStudentGrades, {
      studentId: args.studentId,
      classId: args.classId,
    });
    
    const submissions = await ctx.runQuery(internal.aiInternal.getStudentSubmissions, {
      studentId: args.studentId,
    });
    
    const sessionLogs = await ctx.runQuery(internal.aiInternal.getUserSessionLogs, {
      userId: args.studentId,
    });
    
    // Calculate average grade
    const gradeScores = grades.map((g: { score: number; maxScore: number }) => (g.score / g.maxScore) * 100);
    const averageGrade = gradeScores.length > 0
      ? gradeScores.reduce((a: number, b: number) => a + b, 0) / gradeScores.length
      : 0;
    
    // Calculate attendance
    const sessions = await ctx.runQuery(internal.aiInternal.getClassSessions, {
      classId: args.classId,
    });
    
    const attendedSessions = sessionLogs.filter((l: { sessionId: Id<"sessions"> }) => 
      sessions.some((s: { _id: Id<"sessions"> }) => s._id === l.sessionId)
    );
    
    const attendanceRate = sessions.length > 0
      ? (attendedSessions.length / sessions.length)
      : 0;
    
    // Weight: 70% grades, 30% attendance
    const predictedGrade = Math.round((averageGrade * 0.7) + (attendanceRate * 100 * 0.3));
    
    const riskLevel: "low" | "medium" | "high" = predictedGrade >= 80 ? "low" : predictedGrade >= 60 ? "medium" : "high";
    
    const recommendations = [];
    if (attendanceRate < 0.8) {
      recommendations.push("Improve attendance to boost grades");
    }
    if (averageGrade < 70) {
      recommendations.push("Schedule office hours with teacher");
    }
    if (submissions.some((s: { submittedAt: number | undefined }) => !s.submittedAt)) {
      recommendations.push("Complete missing assignments");
    }
    
    // Calculate confidence based on data availability
    const confidence = Math.min(90, Math.round(
      (grades.length * 10) + (submissions.length * 5) + (attendanceRate * 30)
    ));
    
    return {
      predictedGrade,
      confidence,
      riskLevel,
      recommendations: recommendations.length ? recommendations : ["Keep up the good work!"],
    };
  },
});

// Generate quiz questions using AI
export const generateQuizQuestions = action({
  args: {
    topic: v.string(),
    questionCount: v.number(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  returns: v.array(v.object({
    text: v.string(),
    options: v.array(v.string()),
    correctOption: v.number(),
    explanation: v.string(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.runQuery(internal.users.getUserByUsername, {
      username: usernameFromIdentity(identity),
    });
    if (!user) throw new Error("User not found");
    
    if (user.role !== "teacher" && user.role !== "admin") {
      throw new Error("Only teachers can generate quiz questions");
    }
    
    const response = await callOpenAI([
      {
        role: "system",
        content: `Generate ${args.questionCount} multiple choice questions about "${args.topic}" at ${args.difficulty} difficulty level. Return ONLY a valid JSON array with objects containing: text (question text), options (array of 4 answer choices), correctOption (0-indexed correct answer), and explanation (brief explanation of why the answer is correct).`,
      },
    ]);
    
    try {
      const questions = JSON.parse(response);
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }
      return questions.slice(0, args.questionCount);
    } catch {
      console.error("Failed to parse AI response as JSON:", response);
      return [];
    }
  },
});
