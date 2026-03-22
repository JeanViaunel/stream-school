"use client";

import { useCallback, useState } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

const MAX_MESSAGE_LENGTH = 2000;
const EMOJIS = [
  "😀", "😂", "🥰", "😎", "🤔", "😴", "😭", "😡",
  "👍", "👎", "❤️", "🔥", "🎉", "✨", "🚀", "💯",
  "👏", "🙏", "🤝", "✅", "❌", "⚠️", "❓", "💡",
];

interface AttachmentPreview {
  id: string;
  file: File;
  preview: string;
  type: "image" | "file";
}

interface MessageInputProps {
  threadParentId?: string;
  placeholder?: string;
}

export function CustomMessageInput({ threadParentId, placeholder }: MessageInputProps) {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const channelData = channel.data as Record<string, unknown> | undefined;
  const channelName = (channelData?.name as string) || "this channel";

  const handleSend = useCallback(async () => {
    if ((!text.trim() && attachments.length === 0) || isSending) return;

    setIsSending(true);
    try {
      // Upload attachments first
      const uploadedAttachments = [];
      for (const attachment of attachments) {
        const response = await channel.sendFile(attachment.file);
        uploadedAttachments.push({
          type: attachment.type,
          asset_url: response.file,
          title: attachment.file.name,
        });
      }

      // Send message
      await channel.sendMessage({
        text: text.trim(),
        parent_id: threadParentId,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      setText("");
      setAttachments([]);
      toast.success("Message sent", { duration: 1500 });
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [channel, text, attachments, threadParentId, isSending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newAttachments: AttachmentPreview[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file) => {
      const id = Math.random().toString(36).substring(7);
      const isImage = file.type.startsWith("image/");
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newAttachments.push({
            id,
            file,
            preview: e.target?.result as string,
            type: "image",
          });
          processedCount++;
          if (processedCount === files.length) {
            setAttachments((prev) => [...prev, ...newAttachments]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        newAttachments.push({
          id,
          file,
          preview: "",
          type: "file",
        });
        processedCount++;
        if (processedCount === files.length) {
          setAttachments((prev) => [...prev, ...newAttachments]);
        }
      }
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setIsEmojiOpen(false);
  };

  const charCount = text.length;
  const showCharCount = charCount > MAX_MESSAGE_LENGTH * 0.8;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;

  return (
    <div
      className={cn(
        "relative border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-3",
        isDragging && "bg-primary/5"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-background/90 px-8 py-6 text-center">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="font-medium text-primary">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-2"
            >
              {attachment.type === "image" ? (
                <img
                  src={attachment.preview}
                  alt="Preview"
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="max-w-[150px]">
                <p className="truncate text-xs font-medium">{attachment.file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(attachment.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-1">
        {/* Emoji picker */}
        <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
          <PopoverTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Smile className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-3">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="rounded p-1.5 text-lg transition-transform hover:scale-125 hover:bg-muted"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* File attachment */}
        <Tooltip>
          <TooltipTrigger
            onClick={() => document.getElementById("file-upload")?.click()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="top">Attach file</TooltipContent>
        </Tooltip>
        <input
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {/* Voice message placeholder */}
        <Tooltip>
          <TooltipTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Mic className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="top">Voice message</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Character count */}
        {showCharCount && (
          <span
            className={cn(
              "text-xs transition-colors",
              isOverLimit ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {charCount}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || `Message ${channelName}...`}
            disabled={isSending}
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none rounded-2xl border-border/60 bg-secondary",
              "pr-12 py-3 text-sm placeholder:text-muted-foreground/50",
              "focus:border-primary/50 focus:ring-1 focus:ring-primary/30",
              isOverLimit && "border-destructive focus:border-destructive"
            )}
            rows={Math.min(5, Math.max(1, text.split("\n").length))}
          />
        </div>

        {/* Send button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!text.trim() && attachments.length === 0) || isSending || isOverLimit}
          className={cn(
            "h-10 w-10 shrink-0 rounded-full transition-all duration-200",
            text.trim() || attachments.length > 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Send className={cn("h-4 w-4", isSending && "animate-pulse")} />
        </Button>
      </div>
    </div>
  );
}
