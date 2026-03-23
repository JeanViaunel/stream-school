"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Helper to get Resend client
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Send parental consent email
export const sendParentConsentEmail = internalAction({
  args: {
    parentEmail: v.string(),
    childName: v.string(),
    consentToken: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const consentLink = `${process.env.NEXT_PUBLIC_APP_URL}/consent/confirm?token=${args.consentToken}`;
    const resend = getResend();
    
    await resend.emails.send({
      from: "StreamSchool <noreply@streamschool.edu>",
      to: args.parentEmail,
      subject: `Action Required — Approve ${args.childName}'s StreamSchool account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Parental Consent Required</h2>
          <p>Hello,</p>
          <p>Your child <strong>${args.childName}</strong> has requested an account on StreamSchool, a virtual classroom platform.</p>
          <p>StreamSchool collects the following data for children under 13:</p>
          <ul>
            <li>Display name and username</li>
            <li>Class participation (which sessions they attended)</li>
            <li>Chat messages sent in class channels (visible to teacher and school admin)</li>
            <li>Assignment submissions</li>
          </ul>
          <p>This data is accessible only to the child's teacher and authorized school staff. No data is shared with third parties.</p>
          <div style="margin: 30px 0;">
            <a href="${consentLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Approve Account</a>
          </div>
          <p style="color: #666; font-size: 12px;">This link expires in 48 hours.</p>
        </div>
      `,
    });
    
    return null;
  },
});

// Send parent invitation email
export const sendParentInvite = internalAction({
  args: {
    parentEmail: v.string(),
    studentName: v.string(),
    linkId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const linkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?link=${args.linkId}&type=parent`;
    const resend = getResend();
    
    await resend.emails.send({
      from: "StreamSchool <noreply@streamschool.edu>",
      to: args.parentEmail,
      subject: `You're invited to connect with ${args.studentName} on StreamSchool`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Parent Invitation</h2>
          <p>Hello,</p>
          <p>You've been invited to create a parent account on StreamSchool to connect with <strong>${args.studentName}</strong>.</p>
          <p>With a parent account, you can:</p>
          <ul>
            <li>View your child's class schedule and attendance</li>
            <li>Monitor assignment submissions and grades</li>
            <li>Receive notifications about class activities</li>
          </ul>
          <div style="margin: 30px 0;">
            <a href="${linkUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Create Parent Account</a>
          </div>
        </div>
      `,
    });
    
    return null;
  },
});

// Send session start notification to parents
// TODO: Implement when dependent queries are available (getClassById, getEnrollments, parentLinks.getByStudent, getUserById)
export const sendSessionStartNotification = internalAction({
  args: {
    sessionId: v.id("sessions"),
    classId: v.id("classes"),
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    // Placeholder - requires internal queries to be implemented first
    // This will send an email to all parents of students in the class
    // when a live session starts
    return null;
  },
});

// Send weekly digest to parents
// TODO: Implement when dependent queries are available (getParentsWithLinkedChildren, getUserById, getSessionsAttendedByStudent, getSubmissionsByStudentSince, getAssignmentById)
export const sendWeeklyDigest = internalAction({
  args: {},
  returns: v.null(),
  handler: async (_ctx) => {
    // Placeholder - requires internal queries to be implemented first
    // This will send a weekly summary email to all parents
    // containing their children's activity for the past week
    console.log("Weekly digest cron ran - placeholder implementation");
    return null;
  },
});
