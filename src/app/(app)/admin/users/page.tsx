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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAddExistingDialog, setShowAddExistingDialog] = useState(false);
  const [addExistingUsername, setAddExistingUsername] = useState("");
  const [lookupUsernameKey, setLookupUsernameKey] = useState<string | null>(null);
  const [isAddingToOrg, setIsAddingToOrg] = useState(false);
  const [removeOrgUserId, setRemoveOrgUserId] = useState<Id<"users"> | null>(null);
  const [isRemovingFromOrg, setIsRemovingFromOrg] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const ALL_ROLES = [
    "student",
    "teacher",
    "co_teacher",
    "parent",
    "admin",
  ] as const;
  type UserRole = (typeof ALL_ROLES)[number];

  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<string, UserRole | "">>({});
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<Id<"users"> | null>(null);

  // Form state for inviting user
  const [inviteForm, setInviteForm] = useState<{
    username: string;
    displayName: string;
    role: UserRole;
    gradeLevel: string;
  }>({
    username: "",
    displayName: "",
    role: "student",
    gradeLevel: "",
  });

  // Redirect non-admins
  useEffect(() => {
    if (session && session.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const users = useQuery(
    api.admin.getAllUsers,
    session?.role === "admin" ? {} : "skip"
  );

  const org = useQuery(
    api.admin.getMyOrganization,
    session?.role === "admin" ? {} : "skip"
  );

  const previewAddUser = useQuery(
    api.admin.previewUserForAddToOrganization,
    session?.role === "admin" && lookupUsernameKey !== null
      ? { username: lookupUsernameKey }
      : "skip"
  );

  const inviteUser = useAction(api.admin.inviteUser);
  const deactivateUser = useMutation(api.admin.deactivateUser);
  const reactivateUser = useMutation(api.admin.reactivateUser);
  const updateUserRole = useMutation(api.admin.updateUserRole);
  const addUserToOrganization = useMutation(api.admin.addUserToOrganization);
  const removeUserFromOrganization = useMutation(api.admin.removeUserFromOrganization);

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
        gradeLevel:
          inviteForm.role === "student" && inviteForm.gradeLevel
            ? parseInt(inviteForm.gradeLevel)
            : undefined,
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
      case "co_teacher": return "bg-teal-500/20 text-teal-500";
      case "parent": return "bg-purple-500/20 text-purple-500";
      case "admin": return "bg-red-500/20 text-red-500";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return "-";
    if (role === "admin") return "Admin";
    if (role === "co_teacher") return "Co-teacher";
    return role;
  };

  const handleLookupExistingUser = () => {
    const trimmed = addExistingUsername.trim();
    if (!trimmed) {
      toast.error("Enter a username to look up");
      return;
    }
    setLookupUsernameKey(trimmed);
  };

  const handleAddExistingToOrg = async () => {
    if (!previewAddUser || !org) return;
    if (previewAddUser.organizationId === org._id) {
      toast.info("This user is already in your organization");
      return;
    }
    setIsAddingToOrg(true);
    try {
      await addUserToOrganization({ userId: previewAddUser._id });
      toast.success("User added to your organization");
      setShowAddExistingDialog(false);
      setAddExistingUsername("");
      setLookupUsernameKey(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setIsAddingToOrg(false);
    }
  };

  const handleConfirmRemoveFromOrg = async () => {
    if (!removeOrgUserId) return;
    setIsRemovingFromOrg(true);
    try {
      await removeUserFromOrganization({ userId: removeOrgUserId });
      toast.success("User removed from organization");
      setRemoveOrgUserId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove user");
    } finally {
      setIsRemovingFromOrg(false);
    }
  };

  const handleUpdateUserRole = async (userId: Id<"users">) => {
    if (!session) return;

    const draft = roleDraftByUserId[userId];
    const roleToSet = draft || (users?.find((u) => u._id === userId)?.role as UserRole | undefined);

    if (!roleToSet || !ALL_ROLES.includes(roleToSet)) {
      toast.error("Please select a valid role");
      return;
    }

    // Server will enforce this too; we disable it for better UX.
    if (session.userId === userId) {
      toast.error("You cannot change your own role");
      return;
    }

    setUpdatingRoleUserId(userId);
    try {
      await updateUserRole({ userId, role: roleToSet });
      setRoleDraftByUserId((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      toast.success("User role updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user role");
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  if (!session || (session.role !== "admin")) {
    return null;
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <header className="mb-8">
        <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <div className="flex flex-wrap gap-2">
          <Dialog
            open={showAddExistingDialog}
            onOpenChange={(open) => {
              setShowAddExistingDialog(open);
              if (!open) {
                setAddExistingUsername("");
                setLookupUsernameKey(null);
              }
            }}
          >
            <DialogTrigger>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Add existing user
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add user to organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Look up an account by username and assign it to your organization. If the user belongs to another organization, they will be moved here.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Username"
                    value={addExistingUsername}
                    onChange={(e) => setAddExistingUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLookupExistingUser();
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleLookupExistingUser}>
                    Look up
                  </Button>
                </div>
                {lookupUsernameKey !== null && previewAddUser === undefined && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Looking up…
                  </p>
                )}
                {lookupUsernameKey !== null && previewAddUser === null && (
                  <p className="text-sm text-destructive">No user found with that username.</p>
                )}
                {previewAddUser && org === undefined && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading organization…
                  </p>
                )}
                {previewAddUser && org === null && (
                  <p className="text-sm text-destructive">
                    No organization found for your account.
                  </p>
                )}
                {previewAddUser && org && (
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                    <p className="font-medium">{previewAddUser.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{previewAddUser.username}</p>
                    {previewAddUser.organizationId === org._id ? (
                      <p className="text-sm text-muted-foreground">Already in this organization.</p>
                    ) : previewAddUser.organizationId ? (
                      <p className="text-sm text-amber-600 dark:text-amber-500">
                        Currently in another organization — adding will move them here.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No organization assigned — will be added to yours.</p>
                    )}
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleAddExistingToOrg}
                      disabled={
                        isAddingToOrg ||
                        previewAddUser.organizationId === org._id
                      }
                    >
                      {isAddingToOrg ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding…
                        </>
                      ) : (
                        "Add to organization"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
                    onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value as UserRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role === "student"
                            ? "Student"
                            : role === "teacher"
                            ? "Teacher"
                            : role === "co_teacher"
                            ? "Co-teacher"
                            : role === "parent"
                            ? "Parent"
                            : "Admin"}
                        </SelectItem>
                      ))}
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
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                      {session.userId !== user._id && (
                        <>
                          <Select
                            value={roleDraftByUserId[user._id] || (user.role ?? "")}
                            onValueChange={(value) => {
                              if (ALL_ROLES.includes(value as UserRole)) {
                                setRoleDraftByUserId((prev) => ({
                                  ...prev,
                                  [user._id]: value as UserRole,
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue placeholder="Set role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role === "student"
                                    ? "Student"
                                    : role === "teacher"
                                    ? "Teacher"
                                    : role === "co_teacher"
                                    ? "Co-teacher"
                                    : role === "parent"
                                    ? "Parent"
                                    : "Admin"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateUserRole(user._id)}
                            disabled={updatingRoleUserId === user._id}
                          >
                            {updatingRoleUserId === user._id ? "Updating..." : "Update"}
                          </Button>
                        </>
                      )}
                    </div>
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
                    <div className="flex flex-col items-end gap-1">
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
                      {user.organizationId !== undefined &&
                        session.userId !== user._id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRemoveOrgUserId(user._id)}
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Remove from org
                          </Button>
                        )}
                    </div>
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

      <AlertDialog
        open={removeOrgUserId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveOrgUserId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears their organization assignment. They will no longer appear in this
              school&apos;s user list unless they are added again. Their account is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingFromOrg}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmRemoveFromOrg();
              }}
              disabled={isRemovingFromOrg}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingFromOrg ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
