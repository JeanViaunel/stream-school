"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { CreateClassModal } from "@/components/class/CreateClassModal";

export default function CreateClassPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [open, setOpen] = useState(true);

  // Redirect non-admins
  if (!session) return null;

  if (session.role !== "admin") {
    return (
      <div className="w-full p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Only admins can create classes.</p>
            <Link href="/dashboard">
              <Button className="mt-4">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CreateClassModal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) router.push("/dashboard");
      }}
    />
  );
}
