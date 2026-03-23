# AI Tutor and Auto-Summary Implementation

## Overview
This implementation adds AI-powered features to Stream School using OpenAI's GPT-4 model:
- **AI Tutor**: Interactive chat interface for students to ask questions
- **Auto-Summary**: Automatic generation of session summaries from chat transcripts

## Files Created

### Backend (Convex)

1. **`convex/ai.ts`** - Main AI actions module
   - `askAITutor` - Students ask questions and get AI-generated answers
   - `summarizeChat` - Generate session summaries from chat messages
   - `generateSessionSummary` - Wrapper for triggering summary generation
   - `getAIUsageStats` - Rate limiting and usage tracking
   - `suggestOptimalSessionTimes` - AI-powered scheduling suggestions
   - `recommendStudyMaterials` - Personalized study recommendations
   - `predictStudentGrades` - Grade prediction based on performance
   - `generateQuizQuestions` - AI-generated quiz questions

2. **`convex/aiInternal.ts`** - Internal queries and mutations
   - Database access functions for AI operations
   - User authorization checks
   - Usage logging

3. **`convex/schema.ts`** - Schema updates
   - Added `summary`, `summaryGeneratedAt`, `summaryKeyPoints` fields to sessions table
   - Added `aiUsageLogs` table for rate limiting

4. **`convex/stream.ts`** - Stream integration
   - Added `getSessionChatMessages` internal action to fetch chat history

5. **`convex/sessions.ts`** - Session updates
   - Added `addSummary` internal mutation to save AI summaries

### Frontend Components

1. **`src/components/ai/AITutor.tsx`** - AI Tutor chat interface
   - Real-time chat with AI
   - Follow-up suggestion buttons
   - Loading states and error handling
   - Clear chat functionality

2. **`src/components/ai/SessionSummary.tsx`** - Session summary display
   - Shows AI-generated summary
   - Lists key points
   - Share and export functionality
   - Expand/collapse view

3. **`src/components/ai/AISummaryButton.tsx`** - Teacher control
   - Button to generate summaries
   - Shows loading state during generation
   - Displays summary in modal when complete
   - Regenerate option

4. **`src/components/ai/index.ts`** - Component exports

## Environment Variables

Add to `.env.local`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Set in Convex dashboard:
```bash
npx convex env set OPENAI_API_KEY your_key_here
```

## Usage

### AI Tutor
```tsx
import { AITutor } from "@/components/ai";

// In your component:
<AITutor classId={classId} className="max-w-2xl" />
```

### Auto-Summary (Teacher View)
```tsx
import { AISummaryButton, SessionSummary } from "@/components/ai";

// Generate button:
<AISummaryButton 
  sessionId={sessionId}
  existingSummary={session.summary}
  existingKeyPoints={session.summaryKeyPoints}
  generatedAt={session.summaryGeneratedAt}
/>

// Or display existing summary:
<SessionSummary
  sessionId={sessionId}
  summary={session.summary}
  keyPoints={session.summaryKeyPoints}
  generatedAt={session.summaryGeneratedAt}
  isTeacher={true}
/>
```

## Features

### AI Tutor
- Context-aware responses using class information and assignments
- Concise answers (max 3 paragraphs)
- Follow-up question suggestions
- Rate limiting (100 requests per 24 hours per user)
- Integration with class enrollment for authorization

### Auto-Summary
- Fetches chat messages from Stream channel
- Generates comprehensive session summaries
- Extracts key discussion points
- Share via clipboard or export as Markdown
- Only teachers can generate summaries
- Regenerate option for updates

### Additional AI Features
- **Smart Scheduling**: Analyzes historical attendance to suggest optimal session times
- **Study Recommendations**: Recommends materials based on weak areas identified from grades
- **Grade Prediction**: Predicts final grades based on performance and attendance
- **Quiz Generation**: Auto-generates quiz questions on specified topics

## Security
- OpenAI API key stored only in Convex environment (server-side)
- User authentication required for all AI actions
- Authorization checks ensure students can only access their own class AI tutors
- Only teachers can generate session summaries
- Rate limiting prevents abuse

## Rate Limits
- 100 AI requests per user per 24 hours
- Tracked in `aiUsageLogs` table

## Integration Points

### ClassCallRoom / Session View
Add these to the class session view:

```tsx
// For students - AI Tutor floating button/widget
<div className="fixed bottom-4 right-4">
  <AITutor classId={classId} />
</div>

// For teachers - Generate summary button
{isTeacher && (
  <AISummaryButton sessionId={sessionId} />
)}

// Show summary when available
{session.summary && (
  <SessionSummary 
    sessionId={sessionId}
    summary={session.summary}
    keyPoints={session.summaryKeyPoints}
    generatedAt={session.summaryGeneratedAt}
  />
)}
```

## Testing

1. Set up OpenAI API key in Convex environment
2. Start a class session with chat messages
3. As a teacher, click "Generate Summary"
4. As a student, open AI Tutor and ask questions
5. Verify rate limiting works (try more than 100 requests)

## Known Issues

1. The codebase has an existing issue with `crypto` import in `convex/auth.ts` that needs to be resolved separately. The AI module doesn't use crypto and is not affected.

2. Some Stream Chat integration functions may need to be verified in production environment.

## Future Enhancements

1. Persistent chat history for AI Tutor
2. Voice-to-text for asking questions
3. Multi-language support
4. Integration with assignment content for better context
5. Student progress tracking via AI analysis
6. Automatic summary generation when session ends
