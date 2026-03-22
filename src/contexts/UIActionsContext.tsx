"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";

interface UIActions {
  openDMModal: () => void;
  openGroupModal: () => void;
}

interface UIActionsRegistry {
  registerDMOpener: (fn: () => void) => void;
  registerGroupOpener: (fn: () => void) => void;
}

const UIActionsContext = createContext<UIActions>({
  openDMModal: () => {},
  openGroupModal: () => {},
});

const UIActionsRegistryContext = createContext<UIActionsRegistry>({
  registerDMOpener: () => {},
  registerGroupOpener: () => {},
});

export function useUIActions() {
  return useContext(UIActionsContext);
}

export function useUIActionsRegistry() {
  return useContext(UIActionsRegistryContext);
}

export function UIActionsProvider({ children }: { children: ReactNode }) {
  const dmRef = useRef<() => void>(() => {});
  const groupRef = useRef<() => void>(() => {});

  // Stable references — never change identity so consumers never re-render
  const stableActions = useRef<UIActions>({
    openDMModal: () => dmRef.current(),
    openGroupModal: () => groupRef.current(),
  });

  const registry = useRef<UIActionsRegistry>({
    registerDMOpener: (fn) => { dmRef.current = fn; },
    registerGroupOpener: (fn) => { groupRef.current = fn; },
  });

  return (
    <UIActionsRegistryContext.Provider value={registry.current}>
      <UIActionsContext.Provider value={stableActions.current}>
        {children}
      </UIActionsContext.Provider>
    </UIActionsRegistryContext.Provider>
  );
}
