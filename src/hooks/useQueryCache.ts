"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

// Hook for cached queries with stale-while-revalidate pattern
export function useCachedQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
  options?: {
    cacheTime?: number; // Time to keep data in cache (ms)
    staleTime?: number; // Time before data is considered stale (ms)
    enabled?: boolean;
  }
) {
  const cacheRef = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map());
  const { cacheTime = 5 * 60 * 1000, staleTime = 60 * 1000, enabled = true } = options ?? {};
  
  const cacheKey = JSON.stringify({ query: query.toString(), args });
  const cached = cacheRef.current.get(cacheKey);
  const now = Date.now();
  const isStale = !cached || now - cached.timestamp > staleTime;
  
  const queryResult = useQuery(query, enabled && isStale ? args : ("skip" as any));
  
  useEffect(() => {
    if (queryResult !== undefined) {
      cacheRef.current.set(cacheKey, { data: queryResult, timestamp: now });
      
      // Cleanup old cache entries
      cacheRef.current.forEach((value, key) => {
        if (now - value.timestamp > cacheTime) {
          cacheRef.current.delete(key);
        }
      });
    }
  }, [queryResult, cacheKey, now, cacheTime]);
  
  return (queryResult ?? cached?.data) as FunctionReturnType<Query> | undefined;
}

// Hook for prefetching queries
export function usePrefetch() {
  const prefetchQueue = useRef<Array<() => void>>([]);
  
  useEffect(() => {
    // Process prefetch queue when idle
    const processQueue = () => {
      if (prefetchQueue.current.length > 0 && "requestIdleCallback" in window) {
        requestIdleCallback(() => {
          const fn = prefetchQueue.current.shift();
          fn?.();
          processQueue();
        });
      }
    };
    
    processQueue();
  }, []);
  
  return {
    prefetch: (fn: () => void) => {
      prefetchQueue.current.push(fn);
    },
  };
}

// Hook for measuring performance
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);
  
  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    
    if (renderCount.current === 1) {
      console.log(`[Performance] ${componentName} mounted in ${(endTime - startTime.current).toFixed(2)}ms`);
    } else {
      console.log(`[Performance] ${componentName} re-rendered (#${renderCount.current})`);
    }
  });
  
  startTime.current = performance.now();
  
  return {
    getRenderCount: () => renderCount.current,
    reset: () => { renderCount.current = 0; },
  };
}

// Hook for lazy loading
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  options?: { threshold?: number; rootMargin?: string }
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const hasLoaded = useRef(false);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasLoaded.current) return;
    
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !hasLoaded.current) {
          hasLoaded.current = true;
          setIsLoading(true);
          
          try {
            const result = await loader();
            setData(result);
          } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to load"));
          } finally {
            setIsLoading(false);
          }
          
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.1, rootMargin: options?.rootMargin }
    );
    
    observer.observe(element);
    return () => observer.disconnect();
  }, [loader, options?.threshold, options?.rootMargin]);
  
  return { data, isLoading, error, elementRef };
}
