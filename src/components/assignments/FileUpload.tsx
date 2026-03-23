"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, File, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileUploadProps {
  assignmentId?: Id<"assignments">;
  submissionId?: Id<"submissions">;
  onUploadComplete?: (attachmentId: Id<"assignmentAttachments"> | Id<"submissionAttachments">) => void;
  onUploadError?: (error: Error) => void;
  maxFileSize?: number; // in bytes, default 50MB
  allowedTypes?: string[];
  uploadType: "assignment" | "submission";
}

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  fileName: string;
  error?: string;
};

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/gif": "GIF",
  "image/webp": "WEBP",
};

export function FileUpload({
  assignmentId,
  submissionId,
  onUploadComplete,
  onUploadError,
  maxFileSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  uploadType,
}: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    fileName: "",
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAssignmentAttachment = useAction(api.assignments.uploadAssignmentAttachment);
  const uploadSubmissionAttachment = useAction(api.assignments.uploadSubmissionAttachment);
  const confirmAssignmentUpload = useMutation(api.assignments.confirmAttachmentUpload);
  const confirmSubmissionUpload = useMutation(api.assignments.confirmSubmissionAttachmentUpload);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)}`;
    }
    if (!allowedTypes.includes(file.type)) {
      return `File type not allowed. Allowed: ${allowedTypes.map(t => FILE_TYPE_LABELS[t] || t).join(", ")}`;
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadState({
        status: "error",
        progress: 0,
        fileName: file.name,
        error,
      });
      onUploadError?.(new Error(error));
      return;
    }

    setUploadState({
      status: "uploading",
      progress: 0,
      fileName: file.name,
    });

    try {
      // Step 1: Get presigned URL from backend
      let result;
      if (uploadType === "assignment" && assignmentId) {
        result = await uploadAssignmentAttachment({
          assignmentId,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });
      } else if (uploadType === "submission" && assignmentId) {
        result = await uploadSubmissionAttachment({
          assignmentId,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });
      } else {
        throw new Error("Invalid upload configuration");
      }

      // Step 2: Upload file to S3
      setUploadState(prev => ({ ...prev, progress: 30 }));

      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = 30 + (event.loaded / event.total) * 60; // 30-90%
            setUploadState(prev => ({ ...prev, progress }));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", result.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Step 3: Confirm upload
      setUploadState(prev => ({ ...prev, progress: 95 }));
      
      if (uploadType === "assignment") {
        await confirmAssignmentUpload({ attachmentId: result.attachmentId as Id<"assignmentAttachments"> });
      } else {
        await confirmSubmissionUpload({ attachmentId: result.attachmentId as Id<"submissionAttachments"> });
      }

      setUploadState({
        status: "success",
        progress: 100,
        fileName: file.name,
      });

      toast.success(`${file.name} uploaded successfully`);
      onUploadComplete?.(result.attachmentId);

      // Reset after 2 seconds
      setTimeout(() => {
        setUploadState({
          status: "idle",
          progress: 0,
          fileName: "",
        });
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setUploadState({
        status: "error",
        progress: 0,
        fileName: file.name,
        error: errorMessage,
      });
      toast.error(errorMessage);
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const clearUpload = useCallback(() => {
    setUploadState({
      status: "idle",
      progress: 0,
      fileName: "",
    });
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = () => {
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  if (uploadState.status === "uploading") {
    return (
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-4">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{uploadState.fileName}</p>
            <p className="text-xs text-muted-foreground">Uploading...</p>
          </div>
        </div>
        <Progress value={uploadState.progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(uploadState.progress)}% complete
        </p>
      </div>
    );
  }

  if (uploadState.status === "success") {
    return (
      <div className="border rounded-lg p-6 space-y-4 bg-green-50/50 dark:bg-green-950/20">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{uploadState.fileName}</p>
            <p className="text-xs text-green-600">Upload complete</p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearUpload}>
            Upload another
          </Button>
        </div>
      </div>
    );
  }

  if (uploadState.status === "error") {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{uploadState.error || "Upload failed"}</span>
          <Button variant="ghost" size="sm" onClick={clearUpload}>
            <X className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept={allowedTypes.join(",")}
      />
      
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        
        <div>
          <p className="font-medium">
            {isDragging ? "Drop file here" : "Click or drag file to upload"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            PDF, DOC, DOCX, or images up to {formatFileSize(maxFileSize)}
          </p>
        </div>
      </div>
    </div>
  );
}