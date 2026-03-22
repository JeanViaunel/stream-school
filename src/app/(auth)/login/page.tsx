"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { MessageSquare, Video, Users } from "lucide-react";

const features = [
  { icon: MessageSquare, label: "Direct Messages" },
  { icon: Users, label: "Group Chats" },
  { icon: Video, label: "Video Calls" },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[44%]">
        <AuthBrandPanel
          headline={<>
            Where<br />classrooms<br />connect.
          </>}
          subheadline="Real-time messaging, HD video calls, and group collaboration — built for education."
          features={features}
        />
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center bg-background p-8">
        {/* Mobile logo */}
        <div className="absolute top-8 left-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card">
            <span className="font-bold text-primary text-sm" style={{ fontFamily: "var(--font-syne)" }}>S</span>
          </div>
          <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)" }}>Stream School</span>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
