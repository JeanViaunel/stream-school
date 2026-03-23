# Session Recordings with Auto-Upload - Setup Guide

This guide explains how to configure and use the Session Recordings feature with automatic upload to AWS S3.

## Overview

The Session Recordings feature allows teachers to:
- Start and stop recordings during live sessions
- Automatically upload recordings to AWS S3 for permanent storage
- View and manage recordings through a dedicated UI
- Students can view recordings for classes they're enrolled in

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Stream SDK    │────▶│  Stream Server   │────▶│  Stream Call    │
│  (Client-side)  │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Recording       │     │ Recording Ready  │     │ Convex          │
│ Controls        │     │ Webhook          │     │ Backend         │
│ (Teacher only)  │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                           │
                              │                           │
                              ▼                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  HTTP Action     │     │ Upload to S3    │
                        │  /webhook/stream │     │ Internal Action │
                        └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   AWS S3        │
                                                  │  (Permanent     │
                                                  │   Storage)      │
                                                  └─────────────────┘
```

## Setup Instructions

### 1. AWS S3 Bucket Configuration

#### Create S3 Bucket
1. Log into AWS Console and navigate to S3
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `stream-school-recordings`)
4. Select your preferred AWS Region
5. **Block Public Access**: Keep "Block all public access" enabled (we'll use signed URLs)
6. Enable versioning (optional but recommended)
7. Create bucket

#### IAM User for Uploads
1. Go to IAM → Users → Create user
2. Name: `stream-school-recordings-uploader`
3. Attach policies directly → Create policy
4. Use this policy JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/recordings/*"
    }
  ]
}
```

5. Attach the policy to the user
6. Generate access keys (Security credentials → Create access key)
7. Save the Access Key ID and Secret Access Key

### 2. Convex Environment Variables

Set the following environment variables in your Convex dashboard:

```bash
npx convex env set AWS_REGION your-region
npx convex env set AWS_ACCESS_KEY_ID your-access-key
npx convex env set AWS_SECRET_ACCESS_KEY your-secret-key
npx convex env set S3_BUCKET_NAME your-bucket-name
```

**Note**: These are separate from `.env.local` and are stored securely in Convex's environment.

### 3. Stream Webhook Configuration

1. Log into Stream Dashboard
2. Navigate to your app → Webhooks
3. Add a new webhook:
   - **URL**: `https://<your-convex-deployment>.convex.site/webhook/stream`
   - **Events**: Enable `call.recording_ready` and `message.new`
4. Save the webhook configuration

The webhook endpoint is defined in `convex/http.ts` and handles:
- `call.recording_ready`: Downloads the recording and uploads to S3
- `message.new`: (Optional) Message moderation

### 4. Environment Variables Template

Update your `.env.local` and Convex environment:

```env
# Stream (already configured)
STREAM_API_KEY=
STREAM_API_SECRET=
NEXT_PUBLIC_STREAM_API_KEY=

# AWS S3 (add these)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=stream-school-recordings
```

## Usage

### For Teachers

1. **Start a Recording**:
   - Join a class session
   - Click the "Record" button in the call controls
   - Confirm the recording consent dialog
   - A red "Recording" indicator will appear

2. **Stop a Recording**:
   - Click "Stop" next to the recording indicator
   - The recording will be processed and uploaded to S3
   - You'll see a notification when it's complete

3. **View Recordings**:
   - Go to the class page
   - Navigate to the "Recordings" tab
   - Click "Watch" to view any recording

### For Students

1. Students can view recordings for classes they're enrolled in
2. Access the "Recordings" tab on the class page
3. Click "Watch" to view recordings

## Data Flow

1. **Recording Started**:
   ```
   Teacher clicks Record → Stream API starts recording → 
   Recording banner shows → recordingStartedAt timestamp saved
   ```

2. **Recording Stopped**:
   ```
   Teacher clicks Stop → Stream stops recording → 
   Stream processes video → Webhook sent when ready
   ```

3. **Auto-Upload**:
   ```
   Webhook received → Download from Stream → 
   Upload to S3 → Update session with S3 URL → 
   Recording available in UI
   ```

## File Structure

```
convex/
  recordings.ts          # Recording actions and S3 upload logic
  sessions.ts            # Session queries (including getClassRecordings)
  http.ts                # Webhook handler
  schema.ts              # Updated with recording timestamps

src/components/recordings/
  RecordingControls.tsx  # Start/stop recording UI (teacher only)
  RecordingList.tsx      # List of recordings for a class
  RecordingPlayer.tsx    # Video player for recorded sessions
```

## Security Considerations

1. **Access Control**:
   - Only teachers can start/stop recordings
   - Only enrolled students and teachers can view recordings
   - S3 objects are not publicly accessible

2. **Consent**:
   - Recording consent dialog shown to teachers before starting
   - All participants should be informed when recording is active

3. **Data Retention**:
   - S3 lifecycle policies can be configured for automatic deletion
   - Convex session records persist for audit purposes

## Troubleshooting

### Recordings Not Appearing
1. Check Stream webhook is configured correctly
2. Verify AWS credentials are set in Convex environment
3. Check Convex logs for webhook processing errors

### S3 Upload Fails
1. Verify IAM user has correct S3 permissions
2. Check AWS credentials are correct
3. Ensure bucket exists in the specified region

### Recording Controls Not Showing
1. Verify user has teacher role
2. Check organization settings (recording must be enabled)
3. Ensure session ID is passed to RecordingControls component

## Cost Considerations

- **Stream**: Recording features may incur additional costs
- **AWS S3**: Storage and data transfer costs apply
- **Data Transfer**: Downloading from Stream and uploading to S3 incurs bandwidth costs

Monitor your usage and set up billing alerts in both Stream and AWS dashboards.
