"use client";

import { useState, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ImportTemplateDownload } from "./ImportTemplateDownload";
import { ImportPreview } from "./ImportPreview";
import { ImportProgress } from "./ImportProgress";
import { Upload, FileText, History, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface BulkImportModalProps {
  classId: Id<"classes">;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: Array<{ row: number; username: string }>;
  existingUsers: Array<{ row: number; username: string }>;
  errors: Array<{ row: number; error: string }>;
  preview: Array<{ row: number; username: string; displayName: string; gradeLevel?: number }>;
}

interface ImportResult {
  imported: number;
  errors: Array<{ row: number; error: string }>;
  importLogId?: Id<"importLogs">;
}

export function BulkImportModal({
  classId,
  isOpen,
  onClose,
  onSuccess,
}: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState("upload");
  const [csvData, setCsvData] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  const validateImportData = useAction(api.admin.validateImportData);
  const bulkImportStudents = useAction(api.admin.bulkImportStudents);
  const importLogs = useQuery(api.admin.getImportLogs, { classId, limit: 10 });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const handleValidate = async () => {
    if (!csvData.trim()) return;
    
    setIsValidating(true);
    setCurrentProgress(0);
    
    try {
      const result = await validateImportData({ classId, csvData });
      setValidationResult(result);
      setActiveTab("preview");
    } catch (error) {
      console.error("Validation failed:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!csvData.trim() || !validationResult || validationResult.validRows === 0) return;
    
    setIsImporting(true);
    setCurrentProgress(0);
    
    try {
      const result = await bulkImportStudents({ classId, csvData });
      setImportResult(result);
      setActiveTab("results");
      onSuccess?.();
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCsvData("");
    setValidationResult(null);
    setImportResult(null);
    setActiveTab("upload");
    setCurrentProgress(0);
  };

  const canImport = validationResult && 
    validationResult.validRows > 0 && 
    validationResult.invalidRows === 0 &&
    validationResult.duplicates.length === 0 &&
    validationResult.existingUsers.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Students
          </DialogTitle>
          <DialogDescription>
            Import multiple students at once using a CSV file
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!validationResult || isImporting}>
              <FileText className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!importResult}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="upload" className="h-full mt-4 space-y-4">
              {/* Instructions */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>CSV Format</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Your CSV file must have these columns:</p>
                  <code className="block bg-muted px-2 py-1 rounded text-sm">
                    username,displayName,password,gradeLevel
                  </code>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Username: 3-50 characters, letters/numbers only</li>
                    <li>Display Name: 1-100 characters</li>
                    <li>Password: At least 8 characters</li>
                    <li>Grade Level: Optional, 1-12</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                  ${csvData ? "bg-muted/50" : ""}
                `}
              >
                {csvData ? (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-primary" />
                    <p className="text-sm font-medium">File loaded</p>
                    <p className="text-xs text-muted-foreground">
                      {csvData.split("\n").length - 1} rows detected
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setCsvData("")}>
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Drag and drop your CSV file here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports .csv files only
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        Browse Files
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              {/* Or paste directly */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Or paste CSV data:</label>
                <Textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder={`username,displayName,password,gradeLevel
john.doe,John Doe,TempPass123,9
jane.smith,Jane Smith,TempPass123,10`}
                  className="font-mono text-sm min-h-[150px]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <ImportTemplateDownload />
                <Button 
                  onClick={handleValidate} 
                  disabled={!csvData.trim() || isValidating}
                >
                  {isValidating ? "Validating..." : "Validate & Preview"}
                </Button>
              </div>

              {/* Progress */}
              {isValidating && (
                <ImportProgress
                  current={currentProgress}
                  total={100}
                  status="validating"
                />
              )}
            </TabsContent>

            <TabsContent value="preview" className="h-full mt-4 overflow-auto">
              {validationResult && (
                <div className="space-y-4">
                  <ImportPreview
                    totalRows={validationResult.totalRows}
                    validRows={validationResult.validRows}
                    invalidRows={validationResult.invalidRows}
                    duplicates={validationResult.duplicates}
                    existingUsers={validationResult.existingUsers}
                    errors={validationResult.errors}
                    preview={validationResult.preview}
                  />
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setActiveTab("upload")}>
                      Back
                    </Button>
                    <Button 
                      onClick={handleImport} 
                      disabled={!canImport || isImporting}
                    >
                      {isImporting ? "Importing..." : `Import ${validationResult.validRows} Students`}
                    </Button>
                  </DialogFooter>

                  {isImporting && (
                    <ImportProgress
                      current={currentProgress}
                      total={validationResult.validRows}
                      status="importing"
                    />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="h-full mt-4">
              {importResult && (
                <div className="space-y-6">
                  {importResult.errors.length === 0 ? (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle>Import Successful!</AlertTitle>
                      <AlertDescription>
                        Successfully imported {importResult.imported} students.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Import Completed with Errors</AlertTitle>
                      <AlertDescription>
                        Imported {importResult.imported} students, but {importResult.errors.length} errors occurred.
                      </AlertDescription>
                    </Alert>
                  )}

                  {importResult.errors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Errors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {importResult.errors.map((err, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Row {err.row}:</span>
                                <span className="text-destructive">{err.error}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={handleReset}>
                      Import More Students
                    </Button>
                    <Button onClick={onClose}>Done</Button>
                  </DialogFooter>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="h-full mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!importLogs || importLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No imports yet
                    </p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {importLogs.map((log: { _id: Id<"importLogs">; importedBy: { displayName: string; username: string }; importedCount: number; totalRows: number; errorCount: number; createdAt: number }) => (
                          <div
                            key={log._id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {log.importedBy.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{log.importedBy.username} · {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-sm font-medium">
                                {log.importedCount} / {log.totalRows} imported
                              </p>
                              {log.errorCount > 0 && (
                                <p className="text-xs text-destructive">
                                  {log.errorCount} errors
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
