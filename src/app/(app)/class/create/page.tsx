"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateClassPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    gradeLevel: "",
  });

  const createClass = useAction(api.classes.createClass);

  // Redirect non-teachers
  if (session?.role !== "teacher" && session?.role !== "school_admin") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Only teachers can create classes.</p>
            <Link href="/dashboard">
              <Button className="mt-4">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.subject || !formData.gradeLevel) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createClass({
        name: formData.name,
        subject: formData.subject,
        gradeLevel: parseInt(formData.gradeLevel),
      });
      
      toast.success("Class created successfully!");
      router.push(`/class/${result.classId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Class</CardTitle>
          <CardDescription>
            Set up a new class for your students. They&apos;ll be able to join using a unique code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                placeholder="e.g., Biology - Period 3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Science, Mathematics, History"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select
                value={formData.gradeLevel}
                onValueChange={(value) => value && setFormData({ ...formData, gradeLevel: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Class...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Class
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
