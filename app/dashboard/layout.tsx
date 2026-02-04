"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Users,
    Settings,
    FileText,
    LogOut,
    Menu,
    X,
    ClipboardCheck,
    UserCircle,
    BarChart3
} from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, role, logOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100"></div>
            </div>
        );
    }

    const navItems = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        ...(role === "Admin" ? [
            { name: "Questions", href: "/dashboard/questions", icon: FileText },
            { name: "Assignments", href: "/dashboard/assignments", icon: ClipboardCheck },
            { name: "Team", href: "/dashboard/team", icon: Users },
            { name: "Results", href: "/dashboard/results", icon: BarChart3 },
        ] : []),
        ...(role === "Manager" ? [
            { name: "My Team", href: "/dashboard/my-team", icon: Users },
        ] : []),
        { name: "My Evaluations", href: "/dashboard/evaluations", icon: UserCircle },
    ];

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Sidebar - Desktop */}
            <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
                <div className="mb-10 flex items-center gap-3 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold tracking-tight">GAP Eval</span>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                                )}
                            >
                                <item.icon className={cn("h-4.5 w-4.5", isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto border-t border-zinc-100 pt-6 dark:border-zinc-800">
                    <div className="flex items-center gap-3 px-2 mb-6">
                        <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                            className="h-8 w-8 rounded-full ring-2 ring-zinc-100 dark:ring-zinc-800"
                            alt={user.displayName || ""}
                        />
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                {user.displayName}
                            </span>
                            <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                {role}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => logOut()}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                    >
                        <LogOut className="h-4.5 w-4.5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white border-b border-zinc-200 px-4 py-3 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">GAP Eval</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-zinc-500 dark:text-zinc-400"
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="fixed inset-0 z-40 lg:hidden bg-white dark:bg-zinc-900 pt-20 p-6"
                    >
                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-4 py-4 text-lg font-medium transition-all border border-transparent",
                                        pathname === item.href
                                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                            : "text-zinc-500"
                                    )}
                                >
                                    <item.icon className="h-6 w-6" />
                                    {item.name}
                                </Link>
                            ))}
                            <button
                                onClick={() => {
                                    logOut();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-lg font-medium text-red-600 transition-all border border-transparent"
                            >
                                <LogOut className="h-6 w-6" />
                                Sign Out
                            </button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-10 pt-24 lg:pt-10 overflow-y-auto">
                <div className="mx-auto max-w-5xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
