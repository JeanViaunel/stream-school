import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn("w-full px-4 md:px-6 py-6 space-y-6", className)}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      
      <Skeleton className="h-64" />
    </div>
  );
}

export function ClassCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function AssignmentSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-72 border-r p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-64' : 'w-48'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="w-full px-4 sm:px-8 py-6 sm:py-10 max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-8 w-32" />
      
      <div className="flex items-center gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      <Skeleton className="h-32" />
      
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(4)].map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UpNextSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-24" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
