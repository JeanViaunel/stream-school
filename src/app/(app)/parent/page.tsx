"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { ParentPortal } from "@/components/parent/ParentPortal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Plus, Loader2 } from "lucide-react";

export default function ParentPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [studentUsername, setStudentUsername] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  // Redirect non-parents
  useEffect(() => {
    if (session && session.role !== "parent") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Query linked children
  const parentLinks = useQuery(
    api.parentLinks.getLinksByParent,
    session?.role === "parent" ? {} : "skip"
  );

  const handleLinkChild = async () => {
    if (!studentUsername.trim()) {
      toast.error("Please enter a student username");
      return;
    }

    setIsLinking(true);
    try {
      // In a real implementation, this would call a Convex mutation
      // to link the parent to the student
      toast.success("Link request sent!");
      setShowLinkDialog(false);
      setStudentUsername("");
    } catch (err) {
      toast.error("Failed to link child account");
    } finally {
      setIsLinking(false);
    }
  };

  if (!session) {
    return null;
  }

  if (session.role !== "parent") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock linked children for demo
  const linkedChildren = [
    { _id: "child1", displayName: "Alex Student", gradeLevel: 8 },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Parent Portal</h1>
          <p className="text-muted-foreground">
            View your child&apos;s progress and stay connected with teachers
          </p>
        </div>
        
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogTrigger>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Link Child
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link to Child Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Enter your child&apos;s username to request access to their account information.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Child&apos;s Username</label>
                <Input
                  placeholder="Enter username"
                  value={studentUsername}
                  onChange={(e) => setStudentUsername(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleLinkChild} 
                disabled={isLinking}
                className="w-full"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  "Send Link Request"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <ParentPortal 
        linkedChildren={linkedChildren}
        onLinkChild={() => setShowLinkDialog(true)}
      />
    </div>
  );
}
