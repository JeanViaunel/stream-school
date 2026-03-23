"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "./FormField";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { User, AlertCircle, CheckCircle2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const { session, login } = useAuth();

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const loginAction = useAction(api.auth.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Loading skeleton state
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const result = await loginAction({ username, password });
      
      // Show success state briefly
      setIsSuccess(true);
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("lastUsername", username);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("lastUsername");
      }
      
      toast.success(`Welcome back, ${result.displayName}!`, {
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      });
      
      login({
        userId: result.userId,
        username,
        displayName: result.displayName,
        streamUserId: result.streamUserId,
        token: result.token,
        convexAuthToken: result.convexAuthToken,
        role: result.role,
        organizationId: result.organizationId,
        gradeLevel: result.gradeLevel,
      });
      
      // Small delay for success animation
      setTimeout(() => {
        router.replace("/dashboard");
      }, 500);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      setError(errorMessage);
      toast.error("Login failed", {
        description: errorMessage,
        icon: <AlertCircle className="w-4 h-4 text-destructive" />,
      });
    } finally {
      setLoading(false);
    }
  }

  // Load remembered username
  useEffect(() => {
    const remembered = localStorage.getItem("rememberMe");
    const lastUser = localStorage.getItem("lastUsername");
    if (remembered === "true" && lastUser) {
      setUsername(lastUser);
      setRememberMe(true);
    }
  }, []);

  if (!isMounted) {
    return <LoginFormSkeleton />;
  }

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[360px] space-y-6"
    >
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-syne)" }}>
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your classroom account
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
        <FormField
          id="username"
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="Enter your username"
          icon={<User className="w-5 h-5" />}
          error={error ? "" : undefined}
          required
          autoComplete="username"
          disabled={loading || isSuccess}
        />
        
        <FormField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          error={error ? "" : undefined}
          required
          autoComplete="current-password"
          disabled={loading || isSuccess}
        />
      </motion.div>

      {/* Remember me & Forgot password */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="remember" 
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            disabled={loading || isSuccess}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <label 
            htmlFor="remember" 
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Remember me
          </label>
        </div>
        
        <Link 
          href="/forgot-password" 
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Forgot password?
        </Link>
      </motion.div>

      {/* Submit button with morphing states */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <Button
          type="submit"
          disabled={loading || isSuccess || !username || !password}
          className={`
            w-full h-12 font-semibold text-sm
            transition-all duration-300 ease-out
            ${isSuccess 
              ? "bg-green-600 hover:bg-green-600" 
              : "animate-glow-pulse hover:scale-[1.02] hover:shadow-depth-3"
            }
          `}
          size="lg"
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Success!
              </motion.span>
            ) : loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </motion.span>
            ) : (
              <motion.span
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Sign in
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Register link */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-center text-sm text-muted-foreground"
      >
        No account yet?{" "}
        <Link
          href="/register"
          className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          Create one
        </Link>
      </motion.p>
    </motion.form>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-[360px] space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
      
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  );
}
