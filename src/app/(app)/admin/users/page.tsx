"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Users, 
  Search, 
  UserX, 
  UserCheck,
  Plus,
  ArrowLeft,
  Loader2
} from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Form state for inviting user
  const [inviteForm, setInviteForm] = useState({
    username: "",
    displayName: "",
    role: "student" as "student" | "teacher" | "parent" | "school_admin",
    gradeLevel: "",
  });

  // Redirect non-admins
  useEffect(() => {
    if (session && session.role !== "school_admin" && session.role !== "platform_admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const users = useQuery(
    api.admin.getAllUsers,
    session?.role === "school_admin" || session?.role === "platform_admin" ? {} : "skip"
  );

  const inviteUser = useAction(api.admin.inviteUser);
  const deactivateUser = useMutation(api.admin.deactivateUser);
  const reactivateUser = useMutation(api.admin.reactivateUser);

  const filteredUsers = users?.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteUser = async () => {
    if (!inviteForm.username || !inviteForm.displayName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsInviting(true);
    try {
      await inviteUser({
        username: inviteForm.username,
        displayName: inviteForm.displayName,
        role: inviteForm.role,
        gradeLevel: inviteForm.gradeLevel ? parseInt(inviteForm.gradeLevel) : undefined,
      });
      toast.success("User invited successfully");
      setShowInviteDialog(false);
      setInviteForm({ username: "", displayName: "", role: "student", gradeLevel: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleUserStatus = async (userId: Id<"users">, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateUser({ userId });
        toast.success("User deactivated");
      } else {
        await reactivateUser({ userId });
        toast.success("User reactivated");
      }
    } catch (err) {
      toast.error("Failed to update user status");
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "student": return "bg-blue-500/20 text-blue-500";
      case "teacher": return "bg-green-500/20 text-green-500";
      case "parent": return "bg-purple-500/20 text-purple-500";
      case "school_admin": return "bg-red-500/20 text-red-500";
      case "platform_admin": return "bg-red-500/20 text-red-500";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return "-";
    if (role === "school_admin" || role === "platform_admin") return "admin";
    return role;
  };

  if (!session || (session.role !== "school_admin" && session.role !== "platform_admin")) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <header className="mb-8">
        <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    placeholder="Enter username"
                    value={inviteForm.username}
                    onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    placeholder="Enter display name"
                    value={inviteForm.displayName}
                    onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value: any) => setInviteForm({ ...inviteForm, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="school_admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inviteForm.role === "student" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grade Level</label>
                    <Select
                      value={inviteForm.gradeLevel}
                      onValueChange={(value) => value && setInviteForm({ ...inviteForm, gradeLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                          <SelectItem key={grade} value={grade.toString()}>
                            Grade {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button 
                  onClick={handleInviteUser} 
                  disabled={isInviting}
                  className="w-full"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {user.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.gradeLevel ? `Grade ${user.gradeLevel}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleUserStatus(user._id, !!user.isActive)}
                    >
                      {user.isActive ? (
                        <>
                          <UserX className="w-4 h-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredUsers || filteredUsers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
