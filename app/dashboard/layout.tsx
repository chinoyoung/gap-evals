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
    ChevronRight,
    PieChart
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

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
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cobalt-500 border-t-transparent"></div>
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
                { name: "My Evaluations", href: "/dashboard/evaluations", icon: ClipboardCheck },
                { name: "My Results", href: "/dashboard/results/my-results", icon: PieChart },
                { name: "Account Settings", href: "/dashboard/settings", icon: Settings },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Floating Sidebar - Desktop */}
            <aside className="hidden w-72 flex-col p-4 lg:flex sticky top-0 h-screen">
                <div className="flex h-full flex-col rounded-3xl bg-zinc-900 dark:bg-zinc-950 text-white shadow-2xl shadow-zinc-900/20 overflow-hidden relative">
                    {/* Background Texture for Sidebar */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>

                    {/* Logo Area */}
                    <div className="pt-8 pb-6 px-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-cobalt-500 flex items-center justify-center shadow-lg shadow-cobalt-500/30">
                                <span className="font-bold text-white text-lg">G</span>
                            </div>
                            <div>
                                <span className="text-lg font-bold tracking-tight block leading-none">Evaluator</span>
                                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">Workspace</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar relative z-10 space-y-8 py-4">
                        {navGroups.map((group) => (
                            <div key={group.label} className="space-y-2">
                                <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500/80">
                                    {group.label}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all relative overflow-hidden",
                                                    isActive
                                                        ? "text-white bg-white/10"
                                                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeNavIndicator"
                                                        className="absolute left-0 top-0 bottom-0 w-1 bg-cobalt-500 rounded-r-full"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                    />
                                                )}
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-cobalt-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                                                    {item.name}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* User Profile / Logout */}
                    <div className="p-4 relative z-10 mt-auto bg-zinc-950/30 backdrop-blur-sm border-t border-white/5">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 mb-3 border border-white/5">
                            <Avatar src={user.photoURL || undefined} name={user.displayName || undefined} className="ring-2 ring-zinc-800" />
                            <div className="overflow-hidden">
                                <p className="truncate text-xs font-bold text-white">{user.displayName}</p>
                                <p className="truncate text-[10px] font-medium text-zinc-400">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => logOut()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 dark:bg-zinc-950/80 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <span className="font-black tracking-tight text-lg">GAP Evaluator</span>
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
                        className="fixed inset-0 z-40 lg:hidden bg-zinc-900 text-white pt-24 p-6"
                    >
                        <nav className="overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar space-y-8">
                            {navGroups.map((group) => (
                                <div key={group.label} className="space-y-3">
                                    <h3 className="px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                        {group.label}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.items.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-4 rounded-2xl px-5 py-4 text-lg font-bold transition-all",
                                                    pathname === item.href
                                                        ? "bg-cobalt-600 text-white shadow-lg shadow-cobalt-600/20"
                                                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <item.icon className="h-6 w-6" />
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <button
                                    onClick={() => {
                                        logOut();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex w-full items-center gap-4 rounded-2xl px-5 py-5 text-lg font-bold text-red-500"
                                >
                                    <LogOut className="h-6 w-6" />
                                    Sign Out
                                </button>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area - Updated Structure */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {/* Desktop Header */}
                <div className="hidden lg:block relative z-30">
                    <DashboardHeader />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-8 custom-scrollbar relative z-0">
                    <div className="mx-auto max-w-7xl space-y-8 pb-12">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
