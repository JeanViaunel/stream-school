"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Check,
  Calendar,
  GraduationCap,
  Users,
  Building
} from "lucide-react";
import { differenceInYears, parseISO } from "date-fns";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

type UserRole = "student" | "teacher" | "parent";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, login } = useAuth();

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const registerAction = useAction(api.auth.register);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const debouncedUsername = useDebounce(username, 500);

  // Loading skeleton state
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Resolve organization from subdomain or query param
  useEffect(() => {
    const resolveOrg = async () => {
      const orgSlug = searchParams.get("org") || getSubdomain();
      if (orgSlug) {
        // In a real implementation, you'd fetch the org by slug
        // For now, we'll use the default org
        console.log("Resolving organization:", orgSlug);
      }
    };
    resolveOrg();
  }, [searchParams]);

  // Check username availability
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");

    // Simulate API check (in a real app, this would be a Convex query)
    const timer = setTimeout(() => {
      // For demo purposes, usernames containing "admin" or "test" are taken
      const isTaken = /^(admin|test)/i.test(debouncedUsername);
      setUsernameStatus(isTaken ? "taken" : "available");
    }, 600);

    return () => clearTimeout(timer);
  }, [debouncedUsername]);

  const age = dateOfBirth ? differenceInYears(new Date(), new Date(dateOfBirth)) : null;
  const requiresParentalConsent = age !== null && age < 13;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service");
      toast.error("Please accept the Terms of Service");
      return;
    }

    if (usernameStatus === "taken") {
      setError("Username is already taken");
      toast.error("Username is already taken");
      return;
    }

    if (role === "student" && !dateOfBirth) {
      setError("Date of birth is required for students");
      toast.error("Date of birth is required for students");
      return;
    }

    if (role === "student" && !gradeLevel) {
      setError("Grade level is required for students");
      toast.error("Grade level is required for students");
      return;
    }

    setLoading(true);

    try {
      const result = await registerAction({ 
        username, 
        password, 
        displayName,
        role,
        gradeLevel: gradeLevel ?? undefined,
      });

      if (requiresParentalConsent) {
        // Store pending user info for consent flow
        sessionStorage.setItem("pendingUserId", result.userId);
        sessionStorage.setItem("pendingConsentEmail", "");
        
        toast.info("Parental consent required", {
          description: "Redirecting to consent form...",
        });
        
        router.push("/consent");
        return;
      }

      // Show success state with confetti
      setIsSuccess(true);

      toast.success("Account created! Welcome to Stream School.", {
        icon: <Sparkles className="w-4 h-4 text-yellow-500" />
      });

      login({
        userId: result.userId,
        displayName: result.displayName,
        streamUserId: result.streamUserId,
        token: result.token,
        role,
        gradeLevel: gradeLevel ?? undefined,
      });

      // Confetti effect then redirect
      setTimeout(() => {
        router.replace("/dashboard");
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      toast.error("Registration failed", {
        description: errorMessage,
        icon: <AlertCircle className="w-4 h-4 text-destructive" />
      });
    } finally {
      setLoading(false);
    }
  }

  // Get username suffix icon
  const getUsernameSuffix = () => {
    if (username.length < 3) return null;

    switch (usernameStatus) {
      case "checking":
        return (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        );
      case "available":
        return <Check className="w-4 h-4 text-green-500" />;
      case "taken":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  if (!isMounted) {
    return <RegisterFormSkeleton />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <SuccessView displayName={displayName || username} />
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[360px] space-y-6"
          >
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1
                className="text-[2rem] font-extrabold tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Create account
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a name and username to get started
              </p>
            </motion.div>

            {/* Error with shake animation */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="animate-shake"
                >
                  <div className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fields */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="space-y-5"
            >
              {/* Display Name with live preview */}
              <div className="space-y-2">
                <FormField
                  id="displayName"
                  label="Display name"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="How you'll appear"
                  icon={<User className="w-5 h-5" />}
                  required
                  disabled={loading}
                />

                {/* Live preview */}
                <AnimatePresence>
                  {displayName && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span>Preview:</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {displayName}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Username with availability check */}
              <FormField
                id="username"
                label="Username"
                value={username}
                onChange={setUsername}
                placeholder="Choose a unique username"
                icon={<Mail className="w-5 h-5" />}
                suffix={getUsernameSuffix()}
                required
                disabled={loading}
              />

              {username.length >= 3 && usernameStatus === "taken" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-destructive -mt-4"
                >
                  This username is already taken. Try another.
                </motion.p>
              )}

              {/* Password with strength indicator */}
              <PasswordInput
                id="password"
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="Create a strong password"
                required
                showStrength
                disabled={loading}
              />

              {/* Role Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  I am a...
                </label>
                <Select
                  value={role}
                  onValueChange={(value) => value && setRole(value as UserRole)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent/Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Student-specific fields */}
              <AnimatePresence>
                {role === "student" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Date of Birth */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full h-12 px-4 rounded-md border border-input bg-background text-foreground"
                        required={role === "student"}
                        disabled={loading}
                        max={new Date().toISOString().split("T")[0]}
                      />
                      {age !== null && (
                        <p className="text-xs text-muted-foreground">
                          Age: {age} years old
                          {requiresParentalConsent && (
                            <span className="text-amber-500 ml-2">
                              (Parental consent required)
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Grade Level */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Grade Level
                      </label>
                      <Select
                        value={gradeLevel?.toString() || ""}
                        onValueChange={(value) => value && setGradeLevel(parseInt(value))}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select your grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              Grade {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Teacher-specific fields */}
              <AnimatePresence>
                {role === "teacher" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg border border-border/50 bg-muted/50 p-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      As a teacher, you'll be able to create classes, start live sessions, 
                      and manage student participation. Your account will need admin approval.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Parent-specific fields */}
              <AnimatePresence>
                {role === "parent" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg border border-border/50 bg-muted/50 p-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      As a parent/guardian, you'll be able to link to your child's account, 
                      view their class schedule, and receive session summaries.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Terms checkbox */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-start space-x-3"
            >
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) =>
                  setAcceptedTerms(checked as boolean)
                }
                disabled={loading}
                className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground cursor-pointer select-none leading-relaxed"
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-primary hover:underline"
                  target="_blank"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-primary hover:underline"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
              </label>
            </motion.div>

            {/* Submit button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <Button
                type="submit"
                disabled={loading || !username || !password || !acceptedTerms || (role === "student" && (!dateOfBirth || !gradeLevel))}
                className="w-full h-12 font-semibold text-sm animate-glow-pulse hover:scale-[1.02] hover:shadow-depth-3 transition-all duration-300"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  "Create account"
                )}
              </Button>
            </motion.div>

            {/* Login link */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-center text-sm text-muted-foreground"
            >
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                Sign in
              </Link>
            </motion.p>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}

function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  return parts[0];
}

// Success view with confetti effect
function SuccessView({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[360px] text-center space-y-6"
    >
      {/* Confetti animation */}
      <ConfettiAnimation />

      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center"
      >
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </motion.div>

      {/* Success message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Welcome aboard!
        </h2>
        <p className="text-muted-foreground">
          Your account has been created successfully.
        </p>
        <p className="text-sm text-muted-foreground">
          Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
        </p>
      </motion.div>
    </motion.div>
  );
}

// Simple confetti animation component
function ConfettiAnimation() {
  const colors = ["#8B5CF6", "#A78BFA", "#C4B5FD", "#7C3AED", "#6D28D9"];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 1,
            x: "50%",
            y: "50%",
            scale: 0,
            rotate: 0
          }}
          animate={{
            opacity: [1, 1, 0],
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: [0, 1, 0.5],
            rotate: Math.random() * 720
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            ease: "easeOut",
            delay: Math.random() * 0.5
          }}
          style={{
            position: "absolute",
            width: 8 + Math.random() * 8,
            height: 4 + Math.random() * 4,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: 2
          }}
        />
      ))}
    </div>
  );
}

function RegisterFormSkeleton() {
  return (
    <div className="w-full max-w-[360px] space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  );
}
