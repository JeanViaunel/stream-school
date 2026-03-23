"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Download, Save, Calculator } from "lucide-react";

interface GradebookProps {
  classId: Id<"classes">;
}

export function Gradebook({ classId }: GradebookProps) {
  const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  
  const gradebook = useQuery(api.grades.getGradebookByClass, { classId });
  const recordGrade = useMutation(api.grades.recordGrade);

  const handleCellClick = (studentId: string, assignmentId: string, currentScore: number | null) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(currentScore?.toString() || "");
  };

  const handleSaveGrade = async () => {
    if (!editingCell) return;
    
    const score = parseFloat(editValue);
    if (isNaN(score)) {
      toast.error("Please enter a valid number");
      return;
    }

    try {
      await recordGrade({
        assignmentId: editingCell.assignmentId as Id<"assignments">,
        studentId: editingCell.studentId as Id<"users">,
        score,
        maxScore: 100,
      });
      toast.success("Grade saved");
      setEditingCell(null);
    } catch (err) {
      toast.error("Failed to save grade");
    }
  };

  const exportCSV = () => {
    if (!gradebook) return;
    
    const headers = ["Student", ...gradebook.assignments.map(a => a.title), "Average"];
    const rows = gradebook.students.map(student => {
      const grades = gradebook.assignments.map(assignment => {
        const grade = gradebook.grades.find(
          g => g.studentId === student.id && g.assignmentId === assignment.id
        );
        return grade ? `${grade.score}/${grade.maxScore}` : "—";
      });
      
      const studentGrades = gradebook.grades.filter(g => g.studentId === student.id);
      const avg = studentGrades.length > 0
        ? (studentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / studentGrades.length).toFixed(1)
        : "—";
      
      return [student.displayName, ...grades, `${avg}%`];
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gradebook-${classId}.csv`;
    a.click();
  };

  if (!gradebook) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading gradebook...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Gradebook
        </CardTitle>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Student</TableHead>
                {gradebook.assignments.map(assignment => (
                  <TableHead key={assignment.id} className="text-center min-w-[100px]">
                    <div className="text-xs font-medium">{assignment.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {(gradebook.grades
                        .filter(g => g.assignmentId === assignment.id)
                        .reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / 
                        (gradebook.grades.filter(g => g.assignmentId === assignment.id).length || 1))
                        .toFixed(1)}%
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradebook.students.map(student => {
                const studentGrades = gradebook.grades.filter(g => g.studentId === student.id);
                const overallAvg = studentGrades.length > 0
                  ? (studentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / studentGrades.length)
                  : null;

                return (
                  <TableRow key={student.id}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {student.displayName}
                    </TableCell>
                    {gradebook.assignments.map(assignment => {
                      const grade = gradebook.grades.find(
                        g => g.studentId === student.id && g.assignmentId === assignment.id
                      );
                      const isEditing = editingCell?.studentId === student.id && 
                                       editingCell?.assignmentId === assignment.id;

                      return (
                        <TableCell key={assignment.id} className="text-center p-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-16 h-8 text-center"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveGrade();
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveGrade}>
                                <Save className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCellClick(student.id, assignment.id, grade?.score || null)}
                              className="w-full py-2 px-3 rounded hover:bg-muted transition-colors"
                            >
                              {grade ? (
                                <Badge variant={grade.score / grade.maxScore >= 0.7 ? "default" : 
                                                grade.score / grade.maxScore >= 0.6 ? "secondary" : "destructive"}>
                                  {grade.score}/{grade.maxScore}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </button>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {overallAvg !== null ? (
                        <Badge variant={overallAvg >= 70 ? "default" : overallAvg >= 60 ? "secondary" : "destructive"}>
                          {overallAvg.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
