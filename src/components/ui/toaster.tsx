"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      richColors={false}
      closeButton
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
        info: <Info className="h-4 w-4 text-blue-400" />,
        warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        error: <AlertCircle className="h-4 w-4 text-red-400" />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
      }}
      style={
        {
          "--normal-bg": "oklch(0.095 0.026 268)",
          "--normal-text": "oklch(0.940 0.016 268)",
          "--normal-border": "oklch(1 0 0 / 12%)",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-depth-3 group-[.toaster]:rounded-xl group-[.toaster]:font-sans",
          description: "group-[.toast]:text-muted-foreground text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium",
          closeButton: "group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:transition-colors",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
