"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateClassModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    gradeLevel: "",
    teacherId: "",
  });

  const createClass = useAction(api.classes.createClass);

  const canCreate = session?.role === "admin";

  const users = useQuery(
    api.admin.getAllUsers,
    session?.role === "admin" ? {} : "skip"
  );
  const teachers = users?.filter(
    (u) =>
      u.role === "teacher" ||
      u.role === "co_teacher" ||
      u.role === "admin",
  );

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error("Not authorized to create classes");
      handleClose();
      return;
    }

    if (
      !formData.name ||
      !formData.subject ||
      !formData.gradeLevel ||
      !formData.teacherId
    ) {
      toast.error("Please fill in all fields and select a teacher");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createClass({
        name: formData.name,
        subject: formData.subject,
        gradeLevel: parseInt(formData.gradeLevel),
        teacherId: formData.teacherId as Id<"users">,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-background/90 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Class</DialogTitle>
          <CardDescription className="pt-1">
            Set up a new class for your students. They&apos;ll be able to join using a unique code.
          </CardDescription>
        </DialogHeader>

        {!canCreate && (
          <div className="text-sm text-muted-foreground pt-2">
            You don&apos;t have permission to create classes.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Input
              id="name"
              placeholder="e.g., Biology - Period 3"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading || !canCreate}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Science, Mathematics, History"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                disabled={isLoading || !canCreate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacherId">Teacher</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) =>
                  value && setFormData({ ...formData, teacherId: value })
                }
                disabled={
                  isLoading ||
                  !canCreate ||
                  !teachers ||
                  teachers.length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers?.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.displayName} (@{t.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select
                value={formData.gradeLevel}
                onValueChange={(value) =>
                  value && setFormData({ ...formData, gradeLevel: value })
                }
                disabled={isLoading || !canCreate}
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
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleClose();
              }}
              disabled={isLoading}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Button>

            <Button type="submit" disabled={isLoading || !canCreate}>
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

