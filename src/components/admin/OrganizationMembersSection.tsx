"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  TableRow,
} from "@/components/ui/table";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, UserMinus } from "lucide-react";

function getRoleLabel(role?: string) {
  if (!role) return "-";
  if (role === "admin") return "Admin";
  if (role === "co_teacher") return "Co-teacher";
  return role;
}

function getRoleBadgeClass(role?: string) {
  switch (role) {
    case "student":
      return "bg-blue-500/20 text-blue-500";
    case "teacher":
      return "bg-green-500/20 text-green-500";
    case "co_teacher":
      return "bg-teal-500/20 text-teal-500";
    case "parent":
      return "bg-purple-500/20 text-purple-500";
    case "admin":
      return "bg-red-500/20 text-red-500";
    default:
      return "bg-gray-500/20 text-gray-500";
  }
}

export function OrganizationMembersSection() {
  const { session } = useAuth();
  const [addUsername, setAddUsername] = useState("");
  const [lookupUsernameKey, setLookupUsernameKey] = useState<string | null>(null);
  const [isAddingToOrg, setIsAddingToOrg] = useState(false);
  const [removeOrgUserId, setRemoveOrgUserId] = useState<Id<"users"> | null>(null);
  const [isRemovingFromOrg, setIsRemovingFromOrg] = useState(false);

  const users = useQuery(
    api.admin.getAllUsers,
    session?.role === "admin" ? {} : "skip",
  );
  const org = useQuery(
    api.admin.getMyOrganization,
    session?.role === "admin" ? {} : "skip",
  );
  const previewAddUser = useQuery(
    api.admin.previewUserForAddToOrganization,
    session?.role === "admin" && lookupUsernameKey !== null
      ? { username: lookupUsernameKey }
      : "skip",
  );

  const addUserToOrganization = useMutation(api.admin.addUserToOrganization);
  const removeUserFromOrganization = useMutation(api.admin.removeUserFromOrganization);

  const handleLookup = () => {
    const trimmed = addUsername.trim();
    if (!trimmed) {
      toast.error("Enter a username to look up");
      return;
    }
    setLookupUsernameKey(trimmed);
  };

  const handleAddToOrg = async () => {
    if (!previewAddUser || !org) return;
    if (previewAddUser.organizationId === org._id) {
      toast.info("This user is already in your organization");
      return;
    }
    setIsAddingToOrg(true);
    try {
      await addUserToOrganization({ userId: previewAddUser._id });
      toast.success("User added to your organization");
      setAddUsername("");
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

  if (session?.role !== "admin") {
    return null;
  }

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Add someone by username</p>
            <p className="text-xs text-muted-foreground">
              If they belong to another organization, they will be moved here.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Username"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLookup();
                }}
              />
              <Button type="button" variant="secondary" onClick={handleLookup}>
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
              <div className="space-y-2 rounded-md border bg-background p-3">
                <p className="font-medium">{previewAddUser.displayName}</p>
                <p className="text-sm text-muted-foreground">@{previewAddUser.username}</p>
                {previewAddUser.organizationId === org._id ? (
                  <p className="text-sm text-muted-foreground">Already in this organization.</p>
                ) : previewAddUser.organizationId ? (
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    Currently in another organization — adding will move them here.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No organization assigned — will be added to yours.
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddToOrg}
                  disabled={isAddingToOrg || previewAddUser.organizationId === org._id}
                >
                  {isAddingToOrg ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    "Add to organization"
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Add existing accounts to this school or remove their organization assignment.
            Invite new users, change roles, and deactivate accounts on{" "}
            <Link href="/admin/users" className="text-primary underline underline-offset-4">
              User management
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeClass(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.organizationId !== undefined &&
                    session.userId !== user._id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveOrgUserId(user._id)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove from org
                      </Button>
                    ) : user.organizationId === undefined ? (
                      <span className="text-xs text-muted-foreground">Legacy (no org id)</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!users || users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No members loaded
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
    </>
  );
}
