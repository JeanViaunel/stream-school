"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";
import { 
  Shield, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Lock,
  Eye,
  MessageSquare,
  FileText
} from "lucide-react";
import { toast } from "sonner";

type ConsentStep = "explanation" | "email" | "pending" | "success" | "denied";

interface ConsentWizardProps {
  childName: string;
  childUsername: string;
  onConsentComplete?: () => void;
  onConsentDenied?: () => void;
}

export function ConsentWizard({ 
  childName, 
  childUsername,
  onConsentComplete,
  onConsentDenied 
}: ConsentWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<ConsentStep>("explanation");
  const [parentEmail, setParentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for consent status when in pending state
  useEffect(() => {
    if (step !== "pending") return;

    const interval = setInterval(async () => {
      try {
        // In a real implementation, this would check Convex for consent status
        // const consentStatus = await checkConsentStatus();
        // if (consentStatus.consentGiven) {
        //   setStep("success");
        //   onConsentComplete?.();
        // }
      } catch (err) {
        console.error("Error checking consent status:", err);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [step, onConsentComplete]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate email
    if (!parentEmail || !parentEmail.includes("@")) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      // In a real implementation, this would call a Convex action to send the consent email
      // await sendConsentEmail({ parentEmail, childName, childUsername });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStep("pending");
      toast.success("Consent email sent!", {
        description: `A confirmation email has been sent to ${parentEmail}`,
      });
    } catch (err) {
      setError("Failed to send consent email. Please try again.");
      toast.error("Failed to send email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    setStep("denied");
    onConsentDenied?.();
    // In a real implementation, this would delete the pending user record
    toast.info("Account request cancelled");
    setTimeout(() => {
      router.push("/register");
    }, 3000);
  };

  return (
    <div className="w-full max-w-[480px]">
      <AnimatePresence mode="wait">
        {step === "explanation" && (
          <ExplanationStep 
            key="explanation"
            childName={childName}
            onContinue={() => setStep("email")}
            onDeny={handleDeny}
          />
        )}
        
        {step === "email" && (
          <EmailStep
            key="email"
            parentEmail={parentEmail}
            setParentEmail={setParentEmail}
            isLoading={isLoading}
            error={error}
            onSubmit={handleEmailSubmit}
            onBack={() => setStep("explanation")}
          />
        )}
        
        {step === "pending" && (
          <PendingStep
            key="pending"
            parentEmail={parentEmail}
            onDeny={handleDeny}
          />
        )}
        
        {step === "success" && (
          <SuccessStep
            key="success"
            onContinue={() => router.push("/dashboard")}
          />
        )}
        
        {step === "denied" && (
          <DeniedStep
            key="denied"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExplanationStep({ 
  childName, 
  onContinue, 
  onDeny 
}: { 
  childName: string; 
  onContinue: () => void;
  onDeny: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-syne)" }}>
            Parental Consent Required
          </h1>
          <p className="mt-2 text-muted-foreground">
            We need a parent or guardian to approve this account because {childName} is under 13.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="w-4 h-4" />
          What data we collect:
        </h3>
        
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-primary font-medium">1</span>
            </div>
            <span>Display name and username (visible to teachers and classmates)</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-primary font-medium">2</span>
            </div>
            <span>Class participation (which sessions they attended)</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-primary font-medium">3</span>
            </div>
            <span>Chat messages sent in class channels (visible to teacher and school staff)</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-primary font-medium">4</span>
            </div>
            <span>Assignment submissions and grades</span>
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700">Privacy Promise</p>
            <p className="text-amber-600/80 mt-1">
              This data is accessible only to {childName}&apos;s teacher and authorized school staff. 
              No data is shared with third parties. You can request deletion at any time.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onDeny}
        >
          Do Not Create Account
        </Button>
        <Button
          className="flex-1"
          onClick={onContinue}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

function EmailStep({
  parentEmail,
  setParentEmail,
  isLoading,
  error,
  onSubmit,
  onBack,
}: {
  parentEmail: string;
  setParentEmail: (email: string) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={onSubmit}
      className="space-y-6"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-syne)" }}>
            Enter Parent/Guardian Email
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ll send a consent email to this address. The account cannot be used until consent is confirmed.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <FormField
        id="parentEmail"
        label="Parent/Guardian Email"
        type="email"
        value={parentEmail}
        onChange={setParentEmail}
        placeholder="parent@example.com"
        icon={<Mail className="w-5 h-5" />}
        required
        disabled={isLoading}
      />

      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          The consent link will expire in 48 hours.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isLoading || !parentEmail}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <>
              Send Email
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </motion.form>
  );
}

function PendingStep({
  parentEmail,
  onDeny,
}: {
  parentEmail: string;
  onDeny: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
        <Mail className="w-10 h-10 text-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-syne)" }}>
          Check Your Email
        </h2>
        <p className="text-muted-foreground">
          We&apos;ve sent a consent email to:
        </p>
        <p className="font-medium text-foreground">{parentEmail}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-left space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          What happens next?
        </h3>
        
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>Ask your parent/guardian to check their email</li>
          <li>They&apos;ll click the &quot;Approve Account&quot; button in the email</li>
          <li>Their approval activates the account immediately</li>
          <li>You can then log in and start using StreamSchool</li>
        </ol>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Waiting for approval... This page will update automatically.
        </p>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeny}
          className="text-muted-foreground hover:text-destructive"
        >
          Cancel and delete account request
        </Button>
      </div>
    </motion.div>
  );
}

function SuccessStep({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-syne)" }}>
          Account Approved!
        </h2>
        <p className="text-muted-foreground">
          Your parent/guardian has approved your account. You can now start using StreamSchool.
        </p>
      </div>

      <Button
        className="w-full"
        onClick={onContinue}
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}

function DeniedStep() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-syne)" }}>
          Account Request Cancelled
        </h2>
        <p className="text-muted-foreground">
          The account request has been cancelled. No data has been stored.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Redirecting to registration...
      </p>
    </motion.div>
  );
}
