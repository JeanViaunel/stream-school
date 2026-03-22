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
import { useAuth } from "@/contexts/AuthContext";
import type { UserResponse } from "stream-chat";

interface UserSearchModalProps {
  onSelect: (userId: string) => void;
  onClose: () => void;
}

export function UserSearchModal({ onSelect, onClose }: UserSearchModalProps) {
  const { client } = useChatContext();
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);

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
      setResults(res.users);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search by name or username…"
          value={query}
          onChange={(e) => search(e.target.value)}
          autoFocus
        />
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto mt-2">
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
              onClick={() => onSelect(user.id)}
            >
              <div className="relative shrink-0">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>
                    {(user.name ?? user.id)[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-background ${
                    user.online ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </div>
              <span>{user.name ?? user.id}</span>
            </Button>
          ))}
          {!loading && query.length > 0 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No users found
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
