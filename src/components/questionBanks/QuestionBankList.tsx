"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  BookOpen,
  GraduationCap,
  Tag,
  MoreVertical,
  Edit2,
  Trash2,
  FolderOpen,
  FileQuestion,
  Filter,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuestionBankEditor } from "./QuestionBankEditor";
import { QuestionBankItems } from "./QuestionBankItems";

interface QuestionBankListProps {
  organizationId: Id<"organizations">;
}

export function QuestionBankList({ organizationId }: QuestionBankListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBank, setEditingBank] = useState<{
    _id: Id<"questionBanks">;
    name: string;
    description?: string;
    subject?: string;
    gradeLevel?: number;
  } | null>(null);
  const [deletingBank, setDeletingBank] = useState<{ _id: Id<"questionBanks">; name: string } | null>(null);
  const [viewingBank, setViewingBank] = useState<Id<"questionBanks"> | null>(null);

  const banks = useQuery(api.questionBanks.searchQuestionBanks, {
    organizationId,
    subject: subjectFilter !== "all" ? subjectFilter : undefined,
    gradeLevel: gradeFilter !== "all" ? parseInt(gradeFilter) : undefined,
    searchQuery: searchQuery || undefined,
  });

  const subjects = useQuery(api.questionBanks.getAvailableSubjects, { organizationId });
  
  const deleteBank = useMutation(api.questionBanks.deleteQuestionBank);

  const handleDeleteBank = async () => {
    if (!deletingBank) return;
    await deleteBank({ bankId: deletingBank._id });
    setDeletingBank(null);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSubjectFilter("all");
    setGradeFilter("all");
  };

  const hasFilters = searchQuery || subjectFilter !== "all" || gradeFilter !== "all";

  // If viewing a specific bank, show the items view
  if (viewingBank) {
    return (
      <QuestionBankItems
        bankId={viewingBank}
        organizationId={organizationId}
        onBack={() => setViewingBank(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Question Banks</h2>
          <p className="text-muted-foreground">
            Manage reusable question collections for your assignments
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bank
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search banks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[180px]">
            <Tag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects?.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[140px]">
            <GraduationCap className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {[...Array(12)].map((_, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                Grade {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results Count */}
      {hasFilters && banks && (
        <p className="text-sm text-muted-foreground">
          Showing {banks.length} result{banks.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Banks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {banks?.map((bank, index) => (
            <motion.div
              key={bank._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-md transition-all cursor-pointer h-full" onClick={() => setViewingBank(bank._id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBank({
                              _id: bank._id,
                              name: bank.name,
                              description: bank.description,
                              subject: bank.subject,
                              gradeLevel: bank.gradeLevel,
                            });
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingBank({ _id: bank._id, name: bank.name });
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <h3 className="font-semibold text-lg line-clamp-1 mb-1">{bank.name}</h3>
                  {bank.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {bank.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {bank.subject && (
                      <Badge variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {bank.subject}
                      </Badge>
                    )}
                    {bank.gradeLevel && (
                      <Badge variant="secondary" className="text-xs">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        Grade {bank.gradeLevel}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs ml-auto">
                      <FileQuestion className="h-3 w-3 mr-1" />
                      {bank.questionCount} questions
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {banks?.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium">No question banks yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Create question banks to organize and reuse questions across multiple assignments
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Bank
          </Button>
        </div>
      )}

      {/* Create Bank Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Question Bank</DialogTitle>
            <DialogDescription>
              Create a new collection of reusable questions
            </DialogDescription>
          </DialogHeader>
          <QuestionBankEditor
            organizationId={organizationId}
            onSuccess={() => setShowCreateDialog(false)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Bank Dialog */}
      <Dialog open={!!editingBank} onOpenChange={() => setEditingBank(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Question Bank</DialogTitle>
            <DialogDescription>Update question bank details</DialogDescription>
          </DialogHeader>
          {editingBank && (
            <QuestionBankEditor
              organizationId={organizationId}
              initialData={editingBank}
              onSuccess={() => setEditingBank(null)}
              onCancel={() => setEditingBank(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBank} onOpenChange={() => setDeletingBank(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question Bank</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingBank?.name}&quot;? This will permanently
              delete all {banks?.find((b) => b._id === deletingBank?._id)?.questionCount || 0}{" "}
              questions in this bank. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBank} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
