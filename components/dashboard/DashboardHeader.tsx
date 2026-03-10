"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function DashboardHeader() {
    const { user, role } = useAuth();
    const pathname = usePathname();

    // Generate breadcrumbs from pathname
    const breadcrumbs = pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => ({
            label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
            href: `/${segment}`,
        }));

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-8 backdrop-blur-md bg-white/50 dark:bg-zinc-950/50 border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all">
            {/* Breadcrumbs / Page Title */}
            <div className="flex flex-col">
                <nav className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span className="opacity-50">GAP Evaluator</span>
                    {breadcrumbs.map((breadcrumb, index) => (
                        <div key={breadcrumb.href} className="flex items-center gap-2">
                            <ChevronRight className="h-3 w-3 opacity-50" />
                            <span className={cn(
                                index === breadcrumbs.length - 1 ? "text-zinc-900 dark:text-zinc-200 font-bold" : "hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                            )}>
                                {breadcrumb.label}
                            </span>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <div className="pl-2 border-l border-zinc-200 dark:border-zinc-800">
                    <button className="group flex items-center gap-3 rounded-full pl-2 pr-1 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-none">
                                {user?.displayName?.split(" ")[0]}
                            </p>
                            <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">
                                {role}
                            </p>
                        </div>
                        <Avatar
                            src={user?.photoURL || undefined}
                            name={user?.displayName || undefined}
                            className="h-9 w-9 ring-2 ring-white dark:ring-zinc-950 group-hover:scale-105 transition-transform"
                        />
                    </button>
                </div>
            </div>
        </header>
    );
}
