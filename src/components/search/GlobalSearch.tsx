"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/useVirtualScroll";
import { 
  Search, 
  X, 
  Filter,
  BookOpen,
  FileText,
  MessageSquare,
  User,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SearchCategory = "all" | "classes" | "assignments" | "messages" | "users";
type SortOption = "relevance" | "date" | "name";

interface SearchResult {
  id: string;
  type: "class" | "assignment" | "message" | "user";
  title: string;
  subtitle: string;
  link: string;
  timestamp?: number;
  metadata?: Record<string, string>;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [isOpen, setIsOpen] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  
  const classes = useQuery(api.classes.getClassesByStudent, {});
  const assignments = useQuery(api.assignments.getMyAssignments, { filter: "all", sortBy: "createdAt" });
  
  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];
    
    const searchTerm = debouncedQuery.toLowerCase();
    const allResults: SearchResult[] = [];
    
    // Search classes
    if (category === "all" || category === "classes") {
      classes?.forEach((cls) => {
        if (
          cls.name.toLowerCase().includes(searchTerm) ||
          cls.subject.toLowerCase().includes(searchTerm)
        ) {
          allResults.push({
            id: cls._id,
            type: "class",
            title: cls.name,
            subtitle: `${cls.subject} • Grade ${cls.gradeLevel}`,
            link: `/class/${cls._id}`,
          });
        }
      });
    }
    
    // Search assignments
    if (category === "all" || category === "assignments") {
      assignments?.forEach((assignment) => {
        if (
          assignment.title.toLowerCase().includes(searchTerm) ||
          assignment.className.toLowerCase().includes(searchTerm)
        ) {
          allResults.push({
            id: assignment._id,
            type: "assignment",
            title: assignment.title,
            subtitle: assignment.className,
            link: `/class/${assignment.classId}`,
            timestamp: assignment.dueDateAt,
            metadata: {
              status: assignment.status,
              due: assignment.dueDateAt 
                ? format(assignment.dueDateAt, "MMM d")
                : "No due date",
            },
          });
        }
      });
    }
    
    // Sort results
    return allResults.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (b.timestamp || 0) - (a.timestamp || 0);
        case "name":
          return a.title.localeCompare(b.title);
        default:
          // Relevance - exact matches first
          const aExact = a.title.toLowerCase() === searchTerm;
          const bExact = b.title.toLowerCase() === searchTerm;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return 0;
      }
    });
  }, [debouncedQuery, classes, assignments, category, sortBy]);
  
  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "class":
        return BookOpen;
      case "assignment":
        return FileText;
      case "message":
        return MessageSquare;
      case "user":
        return User;
      default:
        return Search;
    }
  };
  
  const getTypeColor = (type: SearchResult["type"]) => {
    switch (type) {
      case "class":
        return "bg-blue-500/10 text-blue-600";
      case "assignment":
        return "bg-purple-500/10 text-purple-600";
      case "message":
        return "bg-green-500/10 text-green-600";
      case "user":
        return "bg-orange-500/10 text-orange-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes, assignments..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Select value={category} onValueChange={(v) => setCategory(v as SearchCategory)}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="classes">Classes</SelectItem>
            <SelectItem value="assignments">Assignments</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isOpen && query.length >= 2 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
          <CardContent className="p-2">
            {results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-1">
                  {results.map((result) => {
                    const Icon = getIcon(result.type);
                    return (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.link}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className={cn("p-2 rounded-lg", getTypeColor(result.type))}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                            {result.metadata && (
                              <div className="flex gap-2 mt-1">
                                {Object.entries(result.metadata).map(([key, value]) => (
                                  <Badge key={key} variant="secondary" className="text-[10px]">
                                    {key}: {value}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
