"use client";

import { useState } from "react";
import { useChatContext } from "stream-chat-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { UserResponse } from "stream-chat";

interface NewGroupModalProps {
  onClose: (channelId?: string) => void;
}

export function NewGroupModal({ onClose }: NewGroupModalProps) {
  const { client } = useChatContext();
  const { session } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResponse[]>([]);
  const [selected, setSelected] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await client.queryUsers(
        {
          id: { $ne: session!.streamUserId },
          $or: [
            { name: { $autocomplete: q } },
            { id: { $autocomplete: q } },
          ],
        },
        { name: 1 },
        { limit: 10 }
      );
      setResults(
        res.users.filter((u) => !selected.some((s) => s.id === u.id))
      );
    } finally {
      setLoading(false);
    }
  }

  function addMember(user: UserResponse) {
    setSelected((prev) => [...prev, user]);
    setResults((prev) => prev.filter((u) => u.id !== user.id));
    setQuery("");
  }

  function removeMember(userId: string) {
    setSelected((prev) => prev.filter((u) => u.id !== userId));
  }

  async function createGroup() {
    if (!groupName.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const members = [
        session!.streamUserId,
        ...selected.map((u) => u.id),
      ];
      const channel = client.channel("messaging", {
        name: groupName,
        members,
      });
      await channel.watch();
      onClose(channel.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Group Chat</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((u) => (
              <Badge key={u.id} variant="secondary" className="gap-1">
                {u.name ?? u.id}
                <button onClick={() => removeMember(u.id)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Input
          placeholder="Add members by name…"
          value={query}
          onChange={(e) => search(e.target.value)}
        />

        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Searching…
            </p>
          )}
          {results.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => addMember(user)}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback>
                  {(user.name ?? user.id)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{user.name ?? user.id}</span>
            </Button>
          ))}
        </div>

        <Button
          onClick={createGroup}
          disabled={creating || !groupName.trim() || selected.length === 0}
        >
          {creating ? "Creating…" : "Create Group"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
