"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Trash2, AlertTriangle, Shield } from "lucide-react";

type FlagStatus = "pending" | "reviewed" | "actioned" | "dismissed";

interface ModerationFlag {
  _id: Id<"moderationFlags">;
  _creationTime: number;
  messageId: string;
  channelId: string;
  userId: Id<"users">;
  messageText: string;
  toxicityScore: number;
  severeToxicityScore: number;
  identityAttackScore: number;
  status: FlagStatus;
  reviewedBy?: Id<"users">;
  reviewedAt?: number;
  organizationId: Id<"organizations">;
  createdAt: number;
  userDisplayName: string;
}

export function ModerationQueue() {
  const [activeTab, setActiveTab] = useState<FlagStatus | "all">("pending");

  const flags = useQuery(
    api.moderation.getFlagQueue,
    activeTab === "all" ? {} : { status: activeTab }
  );

  const reviewAndDelete = useAction(api.moderationActions.reviewAndDelete);

  const [processingId, setProcessingId] = useState<Id<"moderationFlags"> | null>(null);

  const handleApprove = async (flag: ModerationFlag) => {
    setProcessingId(flag._id);
    try {
      await reviewAndDelete({
        flagId: flag._id,
        status: "dismissed",
      });

      toast.success("Message approved and delivered");
    } catch (err) {
      toast.error("Failed to approve message");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (flag: ModerationFlag) => {
    setProcessingId(flag._id);
    try {
      await reviewAndDelete({
        flagId: flag._id,
        status: "actioned",
      });

      toast.success("Message deleted");
    } catch (err) {
      toast.error("Failed to delete message");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (flag: ModerationFlag) => {
    setProcessingId(flag._id);
    try {
      await reviewAndDelete({
        flagId: flag._id,
        status: "reviewed",
      });
      toast.success("Flag dismissed");
    } catch (err) {
      toast.error("Failed to dismiss flag");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: FlagStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "reviewed":
        return <Badge variant="outline">Reviewed</Badge>;
      case "actioned":
        return <Badge variant="destructive">Deleted</Badge>;
      case "dismissed":
        return <Badge className="bg-green-500">Approved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getToxicityColor = (score: number) => {
    if (score > 0.8) return "text-red-500";
    if (score > 0.6) return "text-orange-500";
    if (score > 0.4) return "text-yellow-500";
    return "text-green-500";
  };

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;

  const pendingCount = flags?.filter((f: ModerationFlag) => f.status === "pending").length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <CardTitle>Content Moderation Queue</CardTitle>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FlagStatus | "all")}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending
              {pendingCount > 0 && (
                <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="actioned">Deleted</TabsTrigger>
            <TabsTrigger value="dismissed">Approved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Toxicity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags?.map((flag: ModerationFlag) => (
                    <TableRow key={flag._id}>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm" title={flag.messageText}>
                          {flag.messageText}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{flag.userDisplayName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className={getToxicityColor(flag.toxicityScore)}>
                            Toxicity: {formatScore(flag.toxicityScore)}
                          </div>
                          {flag.severeToxicityScore > 0.3 && (
                            <div className="text-red-500">
                              Severe: {formatScore(flag.severeToxicityScore)}
                            </div>
                          )}
                          {flag.identityAttackScore > 0.3 && (
                            <div className="text-red-500">
                              Attack: {formatScore(flag.identityAttackScore)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(flag.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(flag.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {flag.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(flag)}
                              disabled={processingId === flag._id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(flag)}
                              disabled={processingId === flag._id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDismiss(flag)}
                              disabled={processingId === flag._id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!flags || flags.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No moderation flags found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
