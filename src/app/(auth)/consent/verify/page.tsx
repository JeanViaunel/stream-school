"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ConsentVerification } from "@/components/auth/ParentalConsent";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { motion } from "framer-motion";
import { Shield, Lock, Users, FileText } from "lucide-react";

function ConsentVerificationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <div className="w-full max-w-md">
      <ConsentVerification token={token} />
    </div>
  );
}

export default function ConsentVerifyPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel - Brand */}
      <AuthBrandPanel
        headline={<>Parental<br />Consent Verification</>}
        subheadline="Verify your consent for your child to use Stream School. COPPA compliant and secure."
        features={[
          { icon: Shield, label: "COPPA Compliant" },
          { icon: Lock, label: "Data Protection" },
          { icon: Users, label: "Safe Community" },
          { icon: FileText, label: "Full Transparency" },
        ]}
      />

      {/* Right panel - Consent verification */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center p-6 lg:p-12"
      >
        <Suspense fallback={
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        }>
          <ConsentVerificationContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
