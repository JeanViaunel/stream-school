"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  File, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  FileText,
  Paperclip,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Attachment {
  _id: Id<"assignmentAttachments"> | Id<"submissionAttachments">;
  _creationTime: number;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
}

interface AttachmentListProps {
  assignmentId?: Id<"assignments">;
  submissionId?: Id<"submissions">;
  canDelete?: boolean;
  emptyMessage?: string;
  className?: string;
  onDelete?: () => void;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  "application/pdf": <FileText className="h-5 w-5 text-red-500" />,
  "application/msword": <FileText className="h-5 w-5 text-blue-500" />,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": <FileText className="h-5 w-5 text-blue-500" />,
  "image/jpeg": <ImageIcon className="h-5 w-5 text-green-500" />,
  "image/png": <ImageIcon className="h-5 w-5 text-green-500" />,
  "image/gif": <ImageIcon className="h-5 w-5 text-purple-500" />,
  "image/webp": <ImageIcon className="h-5 w-5 text-green-500" />,
};

const FILE_TYPE_NAMES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "image/jpeg": "Image",
  "image/png": "Image",
  "image/gif": "GIF",
  "image/webp": "Image",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string): React.ReactNode {
  return FILE_ICONS[mimeType] || <File className="h-5 w-5 text-gray-500" />;
}

function getFileTypeName(mimeType: string): string {
  return FILE_TYPE_NAMES[mimeType] || "File";
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function AttachmentList({
  assignmentId,
  submissionId,
  canDelete = false,
  emptyMessage = "No attachments",
  className,
  onDelete,
}: AttachmentListProps) {
  const assignmentAttachments = useQuery(
    api.assignments.getAssignmentAttachments,
    assignmentId ? { assignmentId } : "skip"
  );
  
  const submissionAttachments = useQuery(
    api.assignments.getSubmissionAttachments,
    submissionId ? { submissionId } : "skip"
  );

  const deleteAssignmentAttachment = useMutation(api.assignments.deleteAssignmentAttachment);
  const deleteSubmissionAttachment = useMutation(api.assignments.deleteSubmissionAttachment);

  const attachments = assignmentId ? assignmentAttachments : submissionAttachments;
  const isLoading = attachments === undefined;

  const handleDelete = async (attachmentId: Id<"assignmentAttachments"> | Id<"submissionAttachments">) => {
    try {
      if (assignmentId) {
        await deleteAssignmentAttachment({ attachmentId: attachmentId as Id<"assignmentAttachments"> });
      } else {
        await deleteSubmissionAttachment({ attachmentId: attachmentId as Id<"submissionAttachments"> });
      }
      toast.success("Attachment deleted");
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete attachment");
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment._id}
            className="group flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            {/* File Icon or Preview */}
            {isImageFile(attachment.mimeType) ? (
              <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                {getFileIcon(attachment.mimeType)}
              </div>
            )}

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={attachment.filename}>
                {attachment.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {getFileTypeName(attachment.mimeType)} • {formatFileSize(attachment.size)} • {formatDistanceToNow(attachment.uploadedAt, { addSuffix: true })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(attachment.url, attachment.filename)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(attachment._id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function AttachmentListCompact({
  assignmentId,
  submissionId,
  canDelete = false,
  className,
  onDelete,
}: AttachmentListProps) {
  const assignmentAttachments = useQuery(
    api.assignments.getAssignmentAttachments,
    assignmentId ? { assignmentId } : "skip"
  );
  
  const submissionAttachments = useQuery(
    api.assignments.getSubmissionAttachments,
    submissionId ? { submissionId } : "skip"
  );

  const deleteAssignmentAttachment = useMutation(api.assignments.deleteAssignmentAttachment);
  const deleteSubmissionAttachment = useMutation(api.assignments.deleteSubmissionAttachment);

  const attachments = assignmentId ? assignmentAttachments : submissionAttachments;

  const handleDelete = async (attachmentId: Id<"assignmentAttachments"> | Id<"submissionAttachments">) => {
    try {
      if (assignmentId) {
        await deleteAssignmentAttachment({ attachmentId: attachmentId as Id<"assignmentAttachments"> });
      } else {
        await deleteSubmissionAttachment({ attachmentId: attachmentId as Id<"submissionAttachments"> });
      }
      toast.success("Attachment deleted");
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete attachment");
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment) => (
        <div
          key={attachment._id}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
        >
          {getFileIcon(attachment.mimeType)}
          <span className="max-w-[150px] truncate">{attachment.filename}</span>
          <span className="text-muted-foreground text-xs">
            ({formatFileSize(attachment.size)})
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleDownload(attachment.url, attachment.filename)}
          >
            <Download className="h-3 w-3" />
          </Button>
          
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => handleDelete(attachment._id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}