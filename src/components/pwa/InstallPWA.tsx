"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if already has deferred prompt (in case event fired before component mounted)
    // @ts-expect-error - checking for deferred prompt
    if (window.deferredPrompt) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no deferred prompt, show instructions dialog
      setShowDialog(true);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferred prompt variable
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismiss = () => {
    setShowDialog(false);
    // Remember that user dismissed (could store in localStorage)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <>
      {/* Floating install button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleInstallClick}
          className="shadow-lg bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Install App
        </Button>
      </div>

      {/* Instructions Dialog for browsers that don't support beforeinstallprompt */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install Stream School
            </DialogTitle>
            <DialogDescription>
              Install Stream School as an app for the best experience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">To install:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>Chrome/Edge:</strong> Click the install icon in the
                  address bar
                </li>
                <li>
                  <strong>Safari (iOS):</strong> Tap Share → Add to Home Screen
                </li>
                <li>
                  <strong>Safari (Mac):</strong> File → Add to Dock
                </li>
                <li>
                  <strong>Firefox:</strong> Menu → Install
                </li>
              </ul>
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Benefits of installing:</p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>Launch from your home screen</li>
                <li>Work offline</li>
                <li>Receive push notifications</li>
                <li>Faster loading</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={handleDismiss}>
              <X className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
            <Button onClick={() => setShowDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
