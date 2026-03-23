"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ScrollText,
  Shield,
  ShieldAlert,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ADMIN_NAV: Array<AdminNavItem> = [
  { href: "/admin", label: "Dashboard", icon: Shield },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/classes", label: "Classes", icon: BookOpen },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="w-full">
      <nav className="mb-4 w-full px-4 md:px-6">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Manage users, classes, and organization settings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ADMIN_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname?.startsWith(`${item.href}/`));

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}
