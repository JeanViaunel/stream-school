"use client";

function getRelativeDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  
  return date.toLocaleDateString([], { 
    weekday: "long", 
    month: "long", 
    day: "numeric", 
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined 
  });
}

interface DateSeparatorProps {
  date: Date;
  isSticky?: boolean;
}

export function DateSeparator({ date, isSticky = false }: DateSeparatorProps) {
  return (
    <div
      className={`flex items-center justify-center py-4 px-4 ${
        isSticky ? "sticky top-0 z-10 bg-background/80 backdrop-blur-md" : ""
      }`}
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      <span className="mx-4 rounded-full border border-border/50 bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
        {getRelativeDateLabel(date)}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

interface NewMessagesDividerProps {
  count?: number;
}

export function NewMessagesDivider({ count }: NewMessagesDividerProps) {
  return (
    <div className="flex items-center justify-center py-3 px-4">
      <div className="h-px flex-1 bg-primary/30" />
      <span className="mx-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        {count ? `${count} new message${count > 1 ? "s" : ""}` : "New messages"}
      </span>
      <div className="h-px flex-1 bg-primary/30" />
    </div>
  );
}
