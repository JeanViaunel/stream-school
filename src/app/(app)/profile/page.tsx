"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "stream-chat-react";
import { toast } from "sonner";
import { 
  Pencil, 
  Check, 
  X, 
  User, 
  AtSign, 
  Calendar, 
  Camera,
  GraduationCap,
  Video,
  Clock,
  Globe,
  BookOpen,
} from "lucide-react";
import type { Session } from "@/lib/session";
import { format } from "date-fns";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleLabel(role: Session["role"] | undefined): string {
  switch (role) {
    case "student":
      return "Student";
    case "teacher":
      return "Teacher";
    case "co_teacher":
      return "Co-teacher";
    case "parent":
      return "Parent";
    case "admin":
      return "Admin";
    default:
      return "—";
  }
}

function roleColor(role: Session["role"] | undefined): string {
  switch (role) {
    case "student":
      return "bg-blue-500/10 text-blue-600";
    case "teacher":
      return "bg-purple-500/10 text-purple-600";
    case "co_teacher":
      return "bg-indigo-500/10 text-indigo-600";
    case "parent":
      return "bg-green-500/10 text-green-600";
    case "admin":
      return "bg-red-500/10 text-red-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ProfilePage() {
  const { session } = useAuth();
  const { client } = useChatContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(session?.displayName ?? "");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const stats = useQuery(api.users.getMyStats);

  async function handleSaveName() {
    if (!displayName.trim() || !session) return;
    setSaving(true);
    try {
      await client.partialUpdateUser({
        id: session.streamUserId,
        set: { name: displayName.trim() },
      });
      toast.success("Display name updated");
      setEditingName(false);
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelName() {
    setDisplayName(session?.displayName ?? "");
    setEditingName(false);
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !session) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // For now, we'll use a placeholder avatar URL
      // In production, you'd upload to a storage service like S3/Cloudinary
      const avatarUrl = URL.createObjectURL(file);
      
      await client.partialUpdateUser({
        id: session.streamUserId,
        set: { image: avatarUrl },
      });
      
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to update avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!session) return null;

  return (
    <div className="w-full px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-2xl font-bold tracking-tight gradient-text"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your personal information and view your stats
            </p>
          </div>

          {/* Main Profile Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10 shrink-0">
                    <AvatarImage src={session.avatarUrl} />
                    <AvatarFallback className="bg-primary/15 text-3xl font-semibold text-primary">
                      {initials(session.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                
                <div className="text-center sm:text-left flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                    <h2 className="text-xl font-bold">{session.displayName}</h2>
                    <Badge className={roleColor(session.role)}>
                      {roleLabel(session.role)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    @{session.streamUserId}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {stats?.joinedAt ? format(stats.joinedAt, "MMM yyyy") : "—"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Bio */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  About Me
                </label>
                <Textarea
                  placeholder="Tell us a bit about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>

              {/* Display Name Edit */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Display Name
                </label>
                {editingName ? (
                  <div className="flex gap-2">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-10 text-sm max-w-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") handleCancelName();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 shrink-0"
                      onClick={handleSaveName}
                      disabled={saving}
                    >
                      <Check className="h-4 w-4 text-emerald-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 shrink-0"
                      onClick={handleCancelName}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <p className="text-sm font-medium rounded-md border border-border/40 px-3 py-2 bg-muted/30 min-w-[200px]">
                      {session.displayName}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingName(true)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{stats.classCount}</p>
                  <p className="text-xs text-muted-foreground">Classes</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">{stats.assignmentCount}</p>
                  <p className="text-xs text-muted-foreground">Assignments</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                    <Video className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold">{stats.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{stats.totalHours}</p>
                  <p className="text-xs text-muted-foreground">Hours</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Username Info */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AtSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Username</p>
                  <p className="text-sm text-muted-foreground">@{session.streamUserId}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Your username is unique and cannot be changed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
