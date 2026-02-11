"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    where,
    getCountFromServer
} from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
    ClipboardList,
    Users,
    Clock,
    CheckCircle2,
    ArrowRight,
    BookOpen,
    Calendar,
    MessageCircle,
    Sparkles,
    type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";

interface StatCard {
    label: string;
    value: string;
    icon: LucideIcon;
    color: string;
    bgLight: string;
    bgDark: string;
    borderColor: string;
}

interface Assignment {
    id: string;
    periodId: string;
    evaluateeId: string;
    evaluateeName: string;
    type: string;
    status: "pending" | "completed";
    createdAt: any;
}

export default function DashboardOverview() {
    const { user, role, isAdmin } = useAuth();
    const [stats, setStats] = useState<StatCard[]>([
        {
            label: "Pending Evaluations",
            value: "0",
            icon: Clock,
            color: "text-amber-600 dark:text-amber-400",
            bgLight: "bg-gradient-to-br from-amber-50 to-amber-100/50",
            bgDark: "dark:bg-gradient-to-br dark:from-amber-500/10 dark:to-amber-500/5",
            borderColor: "border-t-2 border-t-amber-500/20"
        },
        {
            label: "Completed",
            value: "0",
            icon: CheckCircle2,
            color: "text-emerald-600 dark:text-emerald-400",
            bgLight: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
            bgDark: "dark:bg-gradient-to-br dark:from-emerald-500/10 dark:to-emerald-500/5",
            borderColor: "border-t-2 border-t-emerald-500/20"
        },
    ]);
    const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, role]);

    const fetchDashboardData = async () => {
        try {
            const periodsSnap = await getDocs(query(
                collection(db, "periods"),
                where("status", "==", "published")
            ));

            const periodIds = periodsSnap.docs.map(d => d.id);
            let pendingCount = 0;
            let completedCount = 0;
            let totalAssignments = 0;
            const assignments: Assignment[] = [];

            for (const pid of periodIds) {
                const aSnap = await getDocs(query(
                    collection(db, `periods/${pid}/assignments`),
                    where("evaluatorId", "==", user?.uid)
                ));

                aSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === "pending") pendingCount++;
                    if (data.status === "completed") completedCount++;

                    if (data.status === "pending" && assignments.length < 3) {
                        assignments.push({
                            id: doc.id,
                            periodId: pid,
                            ...data
                        } as Assignment);
                    }
                });
            }

            const newStats = [
                {
                    label: "Pending Evaluations",
                    value: String(pendingCount),
                    icon: Clock,
                    color: "text-amber-600 dark:text-amber-400",
                    bgLight: "bg-gradient-to-br from-amber-50 to-amber-100/50",
                    bgDark: "dark:bg-gradient-to-br dark:from-amber-500/10 dark:to-amber-500/5",
                    borderColor: "border-t-2 border-t-amber-500/20"
                },
                {
                    label: "Completed",
                    value: String(completedCount),
                    icon: CheckCircle2,
                    color: "text-emerald-600 dark:text-emerald-400",
                    bgLight: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
                    bgDark: "dark:bg-gradient-to-br dark:from-emerald-500/10 dark:to-emerald-500/5",
                    borderColor: "border-t-2 border-t-emerald-500/20"
                },
            ];

            if (isAdmin) {
                const usersCount = await getCountFromServer(collection(db, "users"));
                for (const pid of periodIds) {
                    const countSnap = await getCountFromServer(collection(db, `periods/${pid}/assignments`));
                    totalAssignments += countSnap.data().count;
                }

                newStats.push(
                    {
                        label: "Total Team Members",
                        value: String(usersCount.data().count),
                        icon: Users,
                        color: "text-cobalt-500 dark:text-cobalt-200",
                        bgLight: "bg-gradient-to-br from-cobalt-50/30 to-cobalt-100/20",
                        bgDark: "dark:bg-gradient-to-br dark:from-cobalt-500/10 dark:to-cobalt-500/5",
                        borderColor: "border-t-2 border-t-cobalt-500/20"
                    },
                    {
                        label: "Total Assignments",
                        value: String(totalAssignments),
                        icon: ClipboardList,
                        color: "text-indigo-600 dark:text-indigo-400",
                        bgLight: "bg-gradient-to-br from-indigo-50 to-indigo-100/50",
                        bgDark: "dark:bg-gradient-to-br dark:from-indigo-500/10 dark:to-indigo-500/5",
                        borderColor: "border-t-2 border-t-indigo-500/20"
                    }
                );
            }

            const usersSnap = await getDocs(collection(db, "users"));
            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            setStats(newStats);
            setActiveAssignments(assignments);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loading className="py-20" />;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="space-y-12">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative"
            >
                <div className="absolute -top-6 left-0 h-1 w-32 bg-gradient-to-r from-cobalt-500 to-cobalt-300 rounded-full" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="h-5 w-5 text-zinc-400" />
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                {currentDate}
                            </p>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                            Welcome back, {user?.displayName?.split(' ')[0]}
                        </h1>
                        <p className="mt-2 text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Here's what's happening with your evaluations today.
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + (i * 0.1) }}
                    >
                        <Card className={`p-6 group cursor-default overflow-hidden relative ${stat.bgLight} ${stat.bgDark} ${stat.borderColor}`}>
                            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${stat.color} bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm`}>
                                <stat.icon className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 tracking-wide">{stat.label}</p>
                                <h3 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{stat.value}</h3>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-12 lg:grid-cols-3">
                <section className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Active Assignments</h2>
                        <Link href="/dashboard/evaluations" className="text-sm font-semibold text-cobalt-600 hover:text-cobalt-700 transition-colors dark:text-cobalt-300 dark:hover:text-cobalt-200 flex items-center gap-1.5 group">
                            View all
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {activeAssignments.length === 0 ? (
                            <EmptyState
                                className="py-20"
                                icon={ClipboardList}
                                title="No active assignments"
                                description="You have no pending evaluations at the moment."
                            />
                        ) : activeAssignments.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + (i * 0.08) }}
                            >
                                <Card className="p-5 flex items-center justify-between hover:border-cobalt-300 hover:shadow-lg hover:shadow-cobalt-500/5 dark:hover:border-cobalt-700 transition-all hover:-translate-y-0.5 group">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Avatar
                                            src={users.find(u => u.id === item.evaluateeId)?.photoURL}
                                            name={item.evaluateeName}
                                            size="md"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-zinc-900 dark:text-zinc-50">{item.evaluateeName}</h4>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-xs font-semibold">
                                                    <Clock className="h-3 w-3" />
                                                    Pending
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mt-1">
                                                {item.type.replace(/-/g, " ")} Evaluation
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/dashboard/evaluations/${item.periodId}/${item.id}`}
                                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-cobalt-600 text-white transition-all hover:bg-cobalt-700 hover:scale-105 active:scale-95 shadow-md shadow-cobalt-600/20 group-hover:shadow-lg group-hover:shadow-cobalt-600/30 dark:bg-cobalt-500 dark:hover:bg-cobalt-600"
                                    >
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-6">Resources</h2>
                        <Card className="relative overflow-hidden bg-gradient-to-br from-cobalt-600 to-cobalt-700 p-8 text-white border-none shadow-2xl shadow-cobalt-600/20 dark:shadow-cobalt-600/40">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold tracking-tight">Evaluation Guide</h3>
                                </div>
                                <p className="text-cobalt-100 leading-relaxed">
                                    Learn how to provide constructive feedback that helps our team grow and succeed together.
                                </p>
                                <Link href="/dashboard/guide" className="block mt-8">
                                    <Button
                                        variant="secondary"
                                        className="w-full font-bold bg-white text-cobalt-700 hover:bg-cobalt-25 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                                    >
                                        Read Guide
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-6 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cobalt-25 text-cobalt-600 dark:bg-cobalt-500/10 dark:text-cobalt-400">
                                    <MessageCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Need Help?</h3>
                                    <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        Contact the HR department for any questions regarding the evaluation process.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </section>
            </div>
        </div>
    );
}
