"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  ChevronDown,
  CheckCircle2,
  Clock,
  UserPlus
} from "lucide-react";

interface LinkedStudent {
  linkId: string;
  studentId: string;
  name: string;
  username: string;
  gradeLevel?: number;
  avatarUrl?: string;
  consentGiven: boolean;
  linkedAt: number;
}

interface ParentNavProps {
  students: LinkedStudent[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
}

export function ParentNav({ students, selectedStudentId, onSelectStudent }: ParentNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Separate students with and without consent
  const activeStudents = students.filter(s => s.consentGiven);
  const pendingStudents = students.filter(s => !s.consentGiven);

  const selectedStudent = students.find(s => s.studentId === selectedStudentId);

  if (students.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Student Selector */}
          {activeStudents.length > 0 && (
            <div className="flex items-center gap-3 flex-1">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground hidden md:inline">
                Viewing:
              </span>
              
              {activeStudents.length === 1 ? (
                <Button variant="outline" className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    {activeStudents[0].avatarUrl ? (
                      <AvatarImage src={activeStudents[0].avatarUrl} alt={activeStudents[0].name} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {activeStudents[0].name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{activeStudents[0].name}</span>
                  <Badge variant="secondary" className="text-xs">
                    Grade {activeStudents[0].gradeLevel}
                  </Badge>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="outline" className="flex items-center gap-2">
                      {selectedStudent ? (
                        <>
                          <Avatar className="w-6 h-6">
                            {selectedStudent.avatarUrl ? (
                              <AvatarImage src={selectedStudent.avatarUrl} alt={selectedStudent.name} />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {selectedStudent.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{selectedStudent.name}</span>
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          <span>Select Student</span>
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {activeStudents.map((student) => (
                      <DropdownMenuItem 
                        key={student.studentId}
                        onClick={() => onSelectStudent(student.studentId)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Avatar className="w-6 h-6">
                          {student.avatarUrl ? (
                            <AvatarImage src={student.avatarUrl} alt={student.name} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Grade {student.gradeLevel}
                          </p>
                        </div>
                        {selectedStudentId === student.studentId && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Pending Consent Section */}
          {pendingStudents.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {pendingStudents.length} pending consent
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto py-1 px-2 text-xs"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Hide' : 'View'}
              </Button>
            </div>
          )}
        </div>

        {/* Expanded Pending Students */}
        {isExpanded && pendingStudents.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Waiting for student consent:
            </p>
            {pendingStudents.map((student) => (
              <div 
                key={student.studentId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-sm">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{student.username} • Linked {new Date(student.linkedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Also export a simple version for sidebar/header use
export function ParentNavCompact({ 
  students, 
  selectedStudentId, 
  onSelectStudent 
}: ParentNavProps) {
  const activeStudents = students.filter(s => s.consentGiven);
  const selectedStudent = students.find(s => s.studentId === selectedStudentId);

  if (students.length === 0) {
    return (
      <Button variant="ghost" size="sm" className="w-full justify-start">
        <UserPlus className="w-4 h-4 mr-2" />
        Link Student
      </Button>
    );
  }

  if (activeStudents.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Avatar className="w-6 h-6">
          {activeStudents[0].avatarUrl ? (
            <AvatarImage src={activeStudents[0].avatarUrl} alt={activeStudents[0].name} />
          ) : null}
          <AvatarFallback className="text-xs">
            {activeStudents[0].name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{activeStudents[0].name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          {selectedStudent ? (
            <>
              <Avatar className="w-6 h-6 mr-2">
                {selectedStudent.avatarUrl ? (
                  <AvatarImage src={selectedStudent.avatarUrl} alt={selectedStudent.name} />
                ) : null}
                <AvatarFallback className="text-xs">
                  {selectedStudent.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate flex-1">{selectedStudent.name}</span>
              <ChevronDown className="w-4 h-4" />
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              <span>Select Student</span>
              <ChevronDown className="w-4 h-4 ml-auto" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {activeStudents.map((student) => (
          <DropdownMenuItem 
            key={student.studentId}
            onClick={() => onSelectStudent(student.studentId)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Avatar className="w-6 h-6">
              {student.avatarUrl ? (
                <AvatarImage src={student.avatarUrl} alt={student.name} />
              ) : null}
              <AvatarFallback className="text-xs">
                {student.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{student.name}</p>
            </div>
            {selectedStudentId === student.studentId && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
