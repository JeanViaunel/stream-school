"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { ArrowLeft, ScrollText } from "lucide-react";

export default function AdminAuditLogPage() {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (
      session &&
      session.role !== "school_admin" &&
      session.role !== "platform_admin"
    ) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  if (session.role !== "school_admin" && session.role !== "platform_admin") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Redirecting…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <Link
        href="/admin"
        className={cn(buttonVariants({ variant: "ghost" }), "mb-6 inline-flex")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Admin
      </Link>
      <header className="mb-8 flex items-center gap-3">
        <ScrollText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Audit log</h1>
          <p className="text-muted-foreground">Administrative actions in your organization</p>
        </div>
      </header>
      <AuditLogViewer />
    </div>
  );
}
