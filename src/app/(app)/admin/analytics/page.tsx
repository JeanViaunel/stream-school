"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { OrgAnalytics } from "@/components/admin/OrgAnalytics";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (session && session.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  if (session.role !== "admin") {
    return (
      <div className="w-full px-4 md:px-6 py-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Redirecting…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <Link
        href="/admin"
        className={cn(buttonVariants({ variant: "ghost" }), "mb-6 inline-flex")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Admin
      </Link>
      <header className="mb-8 flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Organization usage and class health</p>
        </div>
      </header>
      <OrgAnalytics />
    </div>
  );
}
