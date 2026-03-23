"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, UserX, Users } from "lucide-react";

interface ValidationError {
  row: number;
  error: string;
}

interface DuplicateEntry {
  row: number;
  username: string;
}

interface PreviewEntry {
  row: number;
  username: string;
  displayName: string;
  gradeLevel?: number;
}

interface ImportPreviewProps {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: DuplicateEntry[];
  existingUsers: DuplicateEntry[];
  errors: ValidationError[];
  preview: PreviewEntry[];
}

export function ImportPreview({
  totalRows,
  validRows,
  invalidRows,
  duplicates,
  existingUsers,
  errors,
  preview,
}: ImportPreviewProps) {
  const hasIssues = invalidRows > 0 || duplicates.length > 0 || existingUsers.length > 0;
  const canImport = validRows > 0 && !hasIssues;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Valid Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validRows}</div>
            <p className="text-xs text-muted-foreground">Ready to import</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserX className="h-4 w-4 text-destructive" />
              Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {invalidRows + duplicates.length + existingUsers.length}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {canImport ? (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Ready to Import</AlertTitle>
          <AlertDescription>
            All {validRows} students are valid and ready to be imported.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Issues Found</AlertTitle>
          <AlertDescription>
            Please fix the issues below before importing.
          </AlertDescription>
        </Alert>
      )}

      {/* Issues List */}
      {(errors.length > 0 || duplicates.length > 0 || existingUsers.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Issues ({errors.length + duplicates.length + existingUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {duplicates.map((dup) => (
                  <div key={`dup-${dup.row}`} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0">Row {dup.row}</Badge>
                    <span className="text-muted-foreground">Duplicate username:</span>
                    <span className="font-medium">{dup.username}</span>
                  </div>
                ))}
                
                {existingUsers.map((user) => (
                  <div key={`exist-${user.row}`} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0">Row {user.row}</Badge>
                    <span className="text-muted-foreground">Username already exists:</span>
                    <span className="font-medium">{user.username}</span>
                  </div>
                ))}
                
                {errors.map((err) => (
                  <div key={`err-${err.row}`} className="flex items-center gap-2 text-sm">
                    <Badge variant="destructive" className="shrink-0">Row {err.row}</Badge>
                    <span className="text-destructive">{err.error}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Preview List */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview ({preview.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {preview.map((entry) => (
                  <div key={entry.row} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="shrink-0">Row {entry.row}</Badge>
                      <span className="font-medium">{entry.displayName}</span>
                      <span className="text-muted-foreground">@{entry.username}</span>
                    </div>
                    {entry.gradeLevel && (
                      <Badge variant="secondary">Grade {entry.gradeLevel}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
