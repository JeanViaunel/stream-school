# StreamSchool Testing Guide

This guide helps you test all features of the StreamSchool K-12 platform.

## ✅ Completed Features Overview

### V1 - Core Classroom (Complete)
- ✅ User registration with roles (Student, Teacher, Parent, Admin)
- ✅ COPPA-compliant parental consent for under-13 users
- ✅ Class creation and management
- ✅ Join codes for class enrollment
- ✅ Real-time messaging via Stream Chat
- ✅ Live video sessions with Stream Video
- ✅ Waiting room / Lobby for students
- ✅ Teacher admission controls (admit/deny from lobby)
- ✅ Mute all participants
- ✅ Raised hands panel
- ✅ Grade-band adaptive UI (Primary/Middle/High)
- ✅ Parent Portal for viewing child progress
- ✅ Admin panel for user/class management

### V2 - Assignments & Engagement (Complete)
- ✅ Assignment creation (Multiple Choice & Short Answer)
- ✅ Auto-scoring for multiple choice
- ✅ Manual grading with feedback
- ✅ Gradebook with spreadsheet view
- ✅ Live polls during sessions
- ✅ Q&A panel for questions
- ✅ Breakout rooms
- ✅ Content moderation (Perspective API)
- ✅ Email notifications (Resend)

### V3 - Full Platform (Complete)
- ✅ Gradebook with CSV export
- ✅ Scheduled sessions with calendar view
- ✅ iCal feed export
- ✅ Recording support
- ✅ Grade-adaptive UI theming

## 🧪 Testing Scenarios

### 1. User Registration & Roles

**Test: Student Registration**
1. Navigate to `/register`
2. Select "Student" role
3. Fill in: username, password, display name, date of birth, grade level (1-12)
4. If age < 13: Should redirect to `/consent` for parental approval
5. If age >= 13: Should complete registration and redirect to dashboard

**Test: Teacher Registration**
1. Register with "Teacher" role
2. Should be able to create classes immediately
3. No consent required

**Test: Parent Registration**
1. Register with "Parent" role
2. Navigate to `/parent`
3. Click "Link Child" and enter student's username

### 2. Class Management

**Test: Create a Class (as Teacher)**
1. Login as teacher
2. Navigate to `/dashboard`
3. Click "Create New Class"
4. Enter: Name, Subject, Grade Level
5. Class created with auto-generated join code
6. Note the join code for student testing

**Test: Join a Class (as Student)**
1. Login as student
2. Navigate to `/dashboard`
3. Click "Join with Code"
4. Enter join code from teacher
5. Should join class and see it in sidebar

**Test: Archive a Class (as Teacher)**
1. Go to a class page `/class/[classId]`
2. Click settings (gear icon) → "Archive Class"
3. Class should no longer appear in lists

### 3. Live Sessions

**Test: Start a Session (Teacher)**
1. Navigate to class page
2. Click "Start Session"
3. Should create a new session and enter call room

**Test: Join Session (Student)**
1. When teacher starts session, student sees "Join Session" button
2. Click button → enters lobby waiting to be admitted
3. Teacher sees student in "Waiting Room" panel
4. Teacher clicks checkmark to admit
5. Student joins the call

**Test: Lobby/Waiting Room**
1. Student should see lobby screen with class name
2. Should show "Waiting for [TeacherName]..."
3. Teacher can admit or deny students

**Test: In-Call Controls**
- **Teacher**: Mute All button (works)
- **Student**: Raise Hand button (shows in teacher's panel)
- Both: Camera toggle, microphone toggle, screen share

### 4. Assignments

**Test: Create Assignment (Teacher)**
1. Go to class page
2. Scroll to "Assignments" section (bottom)
3. Click "Create Assignment"
4. Fill in: Title, Instructions, Type (Multiple Choice or Short Answer)
5. Add questions:
   - MC: Add options, mark correct one
   - Short Answer: Add question prompts
6. Set due date (optional)
7. Save as draft or Publish

**Test: Submit Assignment (Student)**
1. Student sees published assignment in class
2. Opens assignment viewer
3. Answers questions:
   - MC: Select radio button options
   - Short Answer: Type in textareas
4. Submit
5. For MC: Sees score immediately
6. For Short Answer: Waits for teacher grading

**Test: Grade Assignment (Teacher)**
1. Go to QuizResults component or gradebook
2. See all submissions listed
3. Click on student submission
4. For short answer: Enter score and feedback
5. Save grade

**Test: View Grades**
- **Student**: "My Grades" tab in class page
- **Parent**: View child's grades in Parent Portal
- **Teacher**: Full gradebook with spreadsheet view

### 5. Live Engagement (During Session)

**Test: Polls**
1. Teacher clicks "Launch Poll"
2. Enters question and options
3. Students see poll overlay with radio buttons
4. Students vote
5. Teacher sees live results updating
6. Teacher closes poll

**Test: Q&A**
1. Students submit questions via Q&A panel
2. Teacher sees queue of questions
3. Teacher can "Answer" (highlights student) or "Skip"
4. Students see their question status

**Test: Breakout Rooms**
1. Teacher sets number of rooms (2-8)
2. Chooses manual or auto assignment
3. Clicks "Start Breakout"
4. Students auto-assigned to rooms
5. Teacher can broadcast message to all rooms
6. Teacher can join any room
7. Teacher ends all breakouts

### 6. Parent Portal

**Test: Link Child**
1. Parent logs in
2. Navigates to `/parent`
3. Clicks "Link Child"
4. Enters child's username
5. Child appears in linked children list

**Test: View Child's Progress**
1. Parent sees child's classes
2. Views attendance summary (Present/Late/Absent)
3. Views recent session history
4. Sees teacher contact buttons

### 7. Admin Panel

**Test: Invite Users (Admin)**
1. Navigate to `/admin`
2. Click "View All Users"
3. Click "Invite User"
4. Fill in: username, display name, role
5. For students: select grade level
6. Send invitation
7. User created with temp password

**Test: Deactivate/Reactivate User**
1. In user list, find user
2. Click "Deactivate" (hides user)
3. Filter to see inactive users
4. Click "Activate" (restores user)

**Test: View All Classes**
1. Navigate to `/admin/classes`
2. See all classes in organization
3. See enrollment counts
4. Archive classes if needed

**Test: Moderation Queue**
1. Navigate to `/admin/moderation`
2. See flagged messages (if any)
3. Review message content and toxicity scores
4. Actions: Approve & Deliver, Delete, Dismiss Flag

### 8. Grade-Adaptive UI

**Test: Primary Band (Grades 1-3)**
1. Register/login as grade 1-3 student
2. Observe:
   - ClassSidebar: Large icons, no text labels
   - CallRoom: Simplified controls (no Q&A, no screenshare)
   - RaisedHandsPanel: Single large button
   - AssignmentViewer: Large radio buttons, wizard UI

**Test: Middle Band (Grades 4-8)**
1. Register/login as grade 4-8 student
2. Observe: Medium-sized UI elements with some text

**Test: High Band (Grades 9-12)**
1. Register/login as grade 9-12 student
2. Observe: Compact UI with full features

## 🔧 Environment Variables

Create `.env.local` file with:

```env
# Stream (from base app)
STREAM_API_KEY=your_stream_key
STREAM_API_SECRET=your_stream_secret
NEXT_PUBLIC_STREAM_API_KEY=your_stream_key

# Convex (from base app)
CONVEX_DEPLOYMENT=your_deployment
NEXT_PUBLIC_CONVEX_URL=your_convex_url

# New for EDU features
RESEND_API_KEY=re_your_resend_key
PERSPECTIVE_API_KEY=your_perspective_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AWS S3 (optional, for recordings)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket_name
```

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Set up environment variables
# Copy .env.example to .env.local and fill in values

# Run Convex dev server
npx convex dev

# In another terminal, run Next.js
npm run dev

# Open http://localhost:3000
```

## 🐛 Common Issues & Solutions

### Issue: "User not found" errors
**Solution**: Make sure you have the default organization seeded. Run in Convex dashboard:
```javascript
await api.organizations.createOrganization({ name: "Default School", slug: "default" })
```

### Issue: Stream Chat not connecting
**Solution**: 
1. Check STREAM_API_KEY is set
2. Verify user has been created in Stream (upsertStreamUser is called on registration)
3. Check browser console for connection errors

### Issue: Perspective API not working
**Solution**:
1. Get API key from https://developers.perspectiveapi.com/s/docs-get-started
2. Add to Convex environment variables
3. Note: Free tier has rate limits

### Issue: Parental consent emails not sending
**Solution**:
1. Get Resend API key from https://resend.com
2. Verify domain is verified in Resend
3. Check spam folders

## 📊 Testing Checklist

Use this checklist to verify all features work:

### Authentication
- [ ] Register as student (age > 13)
- [ ] Register as student (age < 13) → consent flow
- [ ] Register as teacher
- [ ] Register as parent
- [ ] Login/logout works
- [ ] Session persists on refresh

### Classes
- [ ] Teacher creates class
- [ ] Student joins via code
- [ ] Class appears in sidebar
- [ ] Class header shows correct info

### Messaging
- [ ] Send message in class channel
- [ ] Receive message in real-time
- [ ] View channel list in sidebar

### Live Sessions
- [ ] Teacher starts session
- [ ] Student joins lobby
- [ ] Teacher admits student
- [ ] Video/audio works both ways
- [ ] Mute all button works
- [ ] Raise hand works
- [ ] Screen share works

### Assignments
- [ ] Teacher creates MC assignment
- [ ] Teacher creates short answer assignment
- [ ] Student submits MC (auto-scored)
- [ ] Student submits short answer
- [ ] Teacher grades submission
- [ ] Student views grade
- [ ] Parent views child's grade

### Engagement
- [ ] Teacher creates poll
- [ ] Student votes in poll
- [ ] Results visible to teacher
- [ ] Q&A questions submitted
- [ ] Teacher answers question
- [ ] Breakout rooms created
- [ ] Students assigned to rooms

### Admin
- [ ] Invite new user
- [ ] Deactivate/reactivate user
- [ ] View all classes
- [ ] Moderation queue accessible
- [ ] Export gradebook CSV

### Parent
- [ ] Link to child account
- [ ] View child's classes
- [ ] View attendance summary
- [ ] View grades

### Grade Bands
- [ ] Primary (1-3) shows simplified UI
- [ ] Middle (4-8) shows medium UI
- [ ] High (9-12) shows full UI

## 📞 Support

For issues:
1. Check browser console for errors
2. Verify all environment variables are set
3. Check Convex dashboard for function errors
4. Review Stream Dashboard for connection issues

## 🎉 Success Criteria

You've successfully tested StreamSchool when:
- ✅ Teacher can create class and start live session
- ✅ Student can join, participate in polls/Q&A
- ✅ Assignments are created, submitted, and graded
- ✅ Parents can view child's progress
- ✅ Admins can manage the organization
- ✅ All grade bands show appropriate UI
- ✅ Content moderation catches toxic messages
- ✅ Recordings are stored (if configured)

**Happy Testing! 🎓**
