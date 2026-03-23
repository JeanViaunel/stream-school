"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Megaphone,
  GraduationCap,
  Calendar,
  AtSign,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Notification {
  _id: string;
  type: "announcement" | "grade" | "session_reminder" | "mention" | "assignment";
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: number;
}

const typeIcons = {
  announcement: Megaphone,
  grade: GraduationCap,
  session_reminder: Calendar,
  mention: AtSign,
  assignment: FileText,
};

const typeColors = {
  announcement: "text-blue-500 bg-blue-500/10",
  grade: "text-green-500 bg-green-500/10",
  session_reminder: "text-purple-500 bg-purple-500/10",
  mention: "text-orange-500 bg-orange-500/10",
  assignment: "text-pink-500 bg-pink-500/10",
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = typeIcons[notification.type];
  const colorClass = typeColors[notification.type];

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        notification.read ? "bg-transparent" : "bg-primary/5",
        "hover:bg-muted cursor-pointer"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          colorClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium text-sm", !notification.read && "font-semibold")}>
            {notification.title}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification._id);
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification._id);
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const notifications = useQuery(api.inAppNotifications.getMyNotifications, { limit: 20 });
  const unreadCount = useQuery(api.inAppNotifications.getUnreadCount);
  const markAsRead = useMutation(api.inAppNotifications.markAsRead);
  const markAllAsRead = useMutation(api.inAppNotifications.markAllAsRead);
  const deleteNotification = useMutation(api.inAppNotifications.deleteNotification);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead({ notificationId: id as any });
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({});
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification({ notificationId: id as any });
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount! > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end" side="bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications === undefined ? (
            <div className="space-y-3 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No notifications
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You will see announcements, grades, and reminders here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification as Notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-muted/50">
          <p className="text-xs text-center text-muted-foreground">
            Showing latest {notifications?.length ?? 0} notifications
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
