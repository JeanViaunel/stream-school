"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Here you could also log to an error tracking service like Sentry
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                We apologize for the inconvenience. An unexpected error has occurred.
              </p>
              
              {this.state.error && (
                <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-32">
                  <p className="font-semibold text-destructive">{this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-muted-foreground">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReset}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for async error handling
export function useErrorHandler() {
  return {
    handleError: (error: unknown) => {
      console.error("Handled error:", error);
      // Could integrate with error tracking service here
    },
  };
}

// Component for section-level error boundaries
export function SectionErrorBoundary({ 
  children, 
  title = "Section" 
}: { 
  children: ReactNode; 
  title?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="m-4">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to load {title.toLowerCase()}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
