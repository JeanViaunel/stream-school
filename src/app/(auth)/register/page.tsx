"use client";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";

const perks = [
  { icon: Zap, label: "Instant messaging" },
  { icon: ShieldCheck, label: "Secure auth" },
  { icon: Sparkles, label: "HD video calls" },
];

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[44%]">
        <AuthBrandPanel
          headline={<>
            Join your<br />classroom<br />today.
          </>}
          subheadline="Set up your account in seconds and start connecting with your class right away."
          features={perks}
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
        <RegisterForm />
      </div>
    </div>
  );
}
