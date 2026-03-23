"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  MessageSquare,
  User,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (!session) return null;

  const isStudent = session.role === "student";

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      href: "/messages",
      label: "Messages",
      icon: MessageSquare,
      show: true,
    },
    {
      href: "/assignments",
      label: "Assignments",
      icon: FileText,
      show: isStudent,
    },
    {
      href: "/dashboard",
      label: "Classes",
      icon: GraduationCap,
      show: !isStudent,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      show: true,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 safe-area-pb">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-full h-full",
                  "transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
