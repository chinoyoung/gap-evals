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
    ShieldCheck,
    ClipboardCheck,
    UserCircle,
    BarChart3,
    Building2,
    CalendarDays,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, role, isAdmin, canManageTeam, logOut } = useAuth();
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
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-900 border-t-transparent dark:border-zinc-100"></div>
            </div>
        );
    }

    const navGroups = [
        {
            label: "Main",
            items: [
                { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
            ]
        },
        ...(isAdmin ? [{
            label: "Administration",
            items: [
                { name: "Evaluation Periods", href: "/dashboard/periods", icon: CalendarDays },
                { name: "Questions Library", href: "/dashboard/questions", icon: FileText },
                { name: "Departments", href: "/dashboard/departments", icon: Building2 },
                { name: "Team Members", href: "/dashboard/team", icon: Users },
                { name: "Roles & Workflow", href: "/dashboard/settings/roles", icon: ShieldCheck },
                { name: "All Results", href: "/dashboard/results", icon: BarChart3 },
            ]
        }] : []),

        {
            label: "Personal Workspace",
            items: [
                { name: "My Evaluations", href: "/dashboard/evaluations", icon: UserCircle },
                { name: "My Results", href: "/dashboard/results/my-results", icon: BarChart3 },
                { name: "Account Settings", href: "/dashboard/settings", icon: Settings },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Sidebar - Desktop */}
            <aside className="hidden w-72 flex-col border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:flex sticky top-0 h-screen">
                <div className="mb-10 flex items-center justify-between px-3 py-2">
                    <div>
                        <span className="text-xl font-black tracking-tight block">GAP Evaluator</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">@goabroad.com</span>
                    </div>
                </div>

                <nav className={cn("flex-1 overflow-y-auto pr-2 custom-scrollbar", isAdmin ? "space-y-8" : "space-y-1")}>
                    {navGroups.map((group) => (
                        <div key={group.label} className={cn("space-y-2", !isAdmin && "space-y-1")}>
                            {isAdmin && (
                                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400/25">
                                    {group.label}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all",
                                                isActive
                                                    ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/10 dark:bg-white dark:text-zinc-900"
                                                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-white dark:text-zinc-900" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-50")} />
                                                {item.name}
                                            </div>
                                            {isActive && <ChevronRight className="h-4 w-4" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="mt-auto pt-6">
                    <div className="flex items-center gap-4 px-3 py-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 mb-6 group cursor-default">
                        <Avatar src={user.photoURL || undefined} name={user.displayName || undefined} />
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                                {user.displayName}
                            </span>
                            <span className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                                {role} Account
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => logOut()}
                        className="group flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 border-2 border-transparent"
                    >
                        <LogOut className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-1" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 dark:bg-zinc-950/80 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <span className="font-black tracking-tight">GAP Evaluator</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    >
                        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed inset-0 z-40 lg:hidden bg-white dark:bg-zinc-950 pt-24 p-6"
                    >
                        <nav className={cn("overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar", isAdmin ? "space-y-6" : "space-y-1")}>
                            {navGroups.map((group) => (
                                <div key={group.label} className={cn("space-y-3", !isAdmin && "space-y-1")}>
                                    {isAdmin && (
                                        <h3 className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                            {group.label}
                                        </h3>
                                    )}
                                    <div className="space-y-1">
                                        {group.items.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-4 rounded-2xl px-5 py-3.5 text-lg font-bold transition-all",
                                                    pathname === item.href
                                                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                                        : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                                )}
                                            >
                                                <item.icon className="h-6 w-6" />
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    onClick={() => {
                                        logOut();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex w-full items-center gap-4 rounded-2xl px-5 py-5 text-lg font-bold text-red-600"
                                >
                                    <LogOut className="h-6 w-6" />
                                    Sign Out
                                </button>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 p-12 lg:p-12 pt-28 lg:pt-12 min-h-screen overflow-y-auto">
                <div className="mx-auto max-w-7xl">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
