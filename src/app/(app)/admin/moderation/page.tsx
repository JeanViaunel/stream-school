"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function AdminModerationPage() {
  const router = useRouter();
  const { session } = useAuth();

  // Redirect non-admins
  useEffect(() => {
    if (session && session.role !== "school_admin" && session.role !== "platform_admin" && session.role !== "teacher") {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  if (session.role !== "school_admin" && session.role !== "platform_admin" && session.role !== "teacher") {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <header className="mb-8">
        <Link href="/admin">
          <Button variant="ghost" className="mb-4 pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Content Moderation</h1>
            <p className="text-muted-foreground">
              Review and manage flagged messages for your organization
            </p>
          </div>
        </div>
      </header>

      <ModerationQueue />
    </div>
  );
}
