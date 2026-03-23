"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";

interface UndoableAction {
  id: string;
  description: string;
  undo: () => void;
  timestamp: number;
}

interface UndoContextValue {
  registerAction: (action: Omit<UndoableAction, "id" | "timestamp">) => string;
  undo: (id: string) => void;
  undoLast: () => void;
  canUndo: boolean;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<UndoableAction[]>([]);
  const [lastUndone, setLastUndone] = useState<UndoableAction | null>(null);
  const actionIdRef = useRef(0);

  const registerAction = useCallback(
    (action: Omit<UndoableAction, "id" | "timestamp">) => {
      const id = `action-${++actionIdRef.current}`;
      const newAction: UndoableAction = {
        ...action,
        id,
        timestamp: Date.now(),
      };
      
      setActions((prev) => [...prev, newAction]);
      
      // Auto-remove after 30 seconds
      setTimeout(() => {
        setActions((prev) => prev.filter((a) => a.id !== id));
      }, 30000);
      
      return id;
    },
    []
  );

  const undo = useCallback(
    (id: string) => {
      const action = actions.find((a) => a.id === id);
      if (action) {
        try {
          action.undo();
          setActions((prev) => prev.filter((a) => a.id !== id));
          setLastUndone(action);
          toast.success(`Undone: ${action.description}`);
        } catch {
          toast.error("Failed to undo action");
        }
      }
    },
    [actions]
  );

  const undoLast = useCallback(() => {
    const lastAction = actions[actions.length - 1];
    if (lastAction) {
      undo(lastAction.id);
    }
  }, [actions, undo]);

  const canUndo = actions.length > 0;

  return (
    <UndoContext.Provider
      value={{ registerAction, undo, undoLast, canUndo }}
    >
      {children}
      {/* Undo Toast */}
      {canUndo && actions.length > 0 && (
        <div className="fixed bottom-24 right-4 z-50 md:bottom-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={undoLast}
            className="gap-2 shadow-lg"
          >
            <Undo2 className="h-4 w-4" />
            Undo {actions[actions.length - 1].description}
          </Button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo must be used within UndoProvider");
  return ctx;
}

// Hook for specific undoable operations
export function useUndoableMutation<T extends (...args: any[]) => Promise<any>>(
  mutation: T,
  options: {
    description: string;
    onUndo: () => void;
  }
) {
  const { registerAction } = useUndo();

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      const result = await mutation(...args);
      
      registerAction({
        description: options.description,
        undo: options.onUndo,
      });
      
      return result;
    },
    [mutation, options, registerAction]
  );

  return execute;
}
