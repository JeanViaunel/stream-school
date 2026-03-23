"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsentWizard } from "@/components/auth/ConsentWizard";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { motion } from "framer-motion";
import { Shield, Lock, Users, FileText } from "lucide-react";

export default function ConsentPage() {
  const router = useRouter();
  const [childName, setChildName] = useState<string>("");
  const [childUsername, setChildUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get pending user info from sessionStorage
    const pendingUserId = sessionStorage.getItem("pendingUserId");
    
    if (!pendingUserId) {
      // No pending user, redirect to register
      router.push("/register");
      return;
    }

    // In a real implementation, fetch user details from Convex
    // For now, use placeholder values
    setChildName("Student");
    setChildUsername("student_user");
    setIsLoading(false);
  }, [router]);

  const handleConsentComplete = () => {
    // Clear sessionStorage
    sessionStorage.removeItem("pendingUserId");
    sessionStorage.removeItem("pendingConsentEmail");
    
    // Redirect to dashboard
    router.push("/dashboard");
  };

  const handleConsentDenied = () => {
    // Clear sessionStorage
    sessionStorage.removeItem("pendingUserId");
    sessionStorage.removeItem("pendingConsentEmail");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel - Brand */}
      <AuthBrandPanel
        headline={<>Parental<br />Consent</>}
        subheadline="We take student privacy seriously. Parental approval is required for users under 13 years old."
        features={[
          { icon: Shield, label: "COPPA Compliant" },
          { icon: Lock, label: "Data Protection" },
          { icon: Users, label: "Safe Community" },
          { icon: FileText, label: "Full Transparency" },
        ]}
      />

      {/* Right panel - Consent form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center p-6 lg:p-12"
      >
        <ConsentWizard
          childName={childName}
          childUsername={childUsername}
          onConsentComplete={handleConsentComplete}
          onConsentDenied={handleConsentDenied}
        />
      </motion.div>
    </div>
  );
}
