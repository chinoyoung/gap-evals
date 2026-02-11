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
    UserCircle,
    BarChart3,
    Building2,
    CalendarDays,
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
            <aside className="hidden w-72 flex-col border-r border-zinc-100 bg-white p-6 dark:border-zinc-800/50 dark:bg-zinc-950/50 lg:flex sticky top-0 h-screen">
                <div className="mb-10 flex items-center gap-3 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-cobalt-500"></div>
                    <div>
                        <span className="text-xl font-black tracking-tight block">GAP Evaluator</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">@goabroad.com</span>
                    </div>
                </div>

                <nav className={cn("flex-1 overflow-y-auto pr-2 custom-scrollbar", isAdmin ? "space-y-8" : "space-y-2")}>
                    {navGroups.map((group) => (
                        <div key={group.label} className={cn("space-y-3", !isAdmin && "space-y-2")}>
                            {isAdmin && (
                                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400/50">
                                    {group.label}
                                </h3>
                            )}
                            <div className="space-y-1.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all",
                                                isActive
                                                    ? "bg-cobalt-500/10 text-cobalt-500 dark:bg-cobalt-50/10 dark:text-cobalt-50"
                                                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                                            )}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-cobalt-500"></div>
                                            )}
                                            <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-cobalt-500 dark:text-cobalt-50" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-50")} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex items-center gap-4 px-3 py-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 mb-6 group cursor-default mt-6">
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
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-zinc-100 px-6 py-4 dark:bg-zinc-950/90 dark:border-zinc-800/50">
                <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-cobalt-500"></div>
                    <span className="font-black tracking-tight">GAP Evaluator</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2.5 h-11 w-11 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        key="mobile-menu"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-40 lg:hidden bg-white dark:bg-zinc-950 pt-24 p-6"
                    >
                        <nav className={cn("overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar", isAdmin ? "space-y-6" : "space-y-2")}>
                            {navGroups.map((group, groupIndex) => (
                                <motion.div
                                    key={group.label}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: groupIndex * 0.05, type: "spring", damping: 25, stiffness: 300 }}
                                    className={cn("space-y-3", !isAdmin && "space-y-2")}
                                >
                                    {isAdmin && (
                                        <h3 className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400/50">
                                            {group.label}
                                        </h3>
                                    )}
                                    <div className="space-y-2">
                                        {group.items.map((item, itemIndex) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <motion.div
                                                    key={item.href}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: (groupIndex * 0.05) + (itemIndex * 0.03), type: "spring", damping: 25, stiffness: 300 }}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={cn(
                                                            "relative flex items-center gap-4 rounded-2xl px-5 py-3.5 text-base font-bold transition-all",
                                                            isActive
                                                                ? "bg-cobalt-500/10 text-cobalt-500 dark:bg-cobalt-50/10 dark:text-cobalt-50"
                                                                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                                                        )}
                                                    >
                                                        {isActive && (
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-cobalt-500"></div>
                                                        )}
                                                        <item.icon className={cn("h-5 w-5", isActive ? "text-cobalt-500 dark:text-cobalt-50" : "")} />
                                                        {item.name}
                                                    </Link>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                            <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800/50">
                                <button
                                    onClick={() => {
                                        logOut();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-base font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                                >
                                    <LogOut className="h-5 w-5" />
                                    Sign Out
                                </button>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 px-5 py-6 lg:px-12 lg:py-12 pt-22 lg:pt-12 min-h-screen overflow-y-auto">
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
