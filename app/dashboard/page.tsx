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
    TrendingUp,
    ArrowRight,
    Loader2
} from "lucide-react";
import Link from "next/link";

interface Assignment {
    id: string;
    periodId: string;
    evaluateeName: string;
    type: string;
    status: "pending" | "completed";
    createdAt: any;
}

export default function DashboardOverview() {
    const { user, role } = useAuth();
    const [stats, setStats] = useState([
        { label: "Pending Evaluations", value: "0", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
        { label: "Completed", value: "0", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    ]);
    const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, role]);

    const fetchDashboardData = async () => {
        try {
            // 1. Fetch all published periods
            const periodsSnap = await getDocs(query(
                collection(db, "periods"),
                where("status", "==", "published")
            ));

            const periodIds = periodsSnap.docs.map(d => d.id);
            let pendingCount = 0;
            let completedCount = 0;
            let totalAssignments = 0;
            const assignments: Assignment[] = [];

            // 2. Fetch assignments for each period
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
                { label: "Pending Evaluations", value: String(pendingCount), icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
                { label: "Completed", value: String(completedCount), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
            ];

            if (role === "Admin") {
                const usersCount = await getCountFromServer(collection(db, "users"));
                // For admin, count across all periods (or just published?)
                // Let's count published assignments for now as it's more relevant
                for (const pid of periodIds) {
                    const countSnap = await getCountFromServer(collection(db, `periods/${pid}/assignments`));
                    totalAssignments += countSnap.data().count;
                }

                newStats.push(
                    { label: "Total Team Members", value: String(usersCount.data().count), icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
                    { label: "Total Assignments", value: String(totalAssignments), icon: ClipboardList, color: "text-indigo-500", bg: "bg-indigo-50" }
                );
            }

            setStats(newStats);
            setActiveAssignments(assignments);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <header>
                <motion.h1
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                >
                    Welcome back, {user?.displayName?.split(' ')[0]}
                </motion.h1>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                    Here's what's happening with your evaluations today.
                </p>
            </header>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800"
                    >
                        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} dark:bg-zinc-800/50`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                                <h3 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</h3>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-500">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Action Area */}
                <section className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Active Assignments</h2>
                        <Link href="/dashboard/evaluations" className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-400">
                            View all
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {activeAssignments.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
                                <p className="text-zinc-500">No active assignments found.</p>
                            </div>
                        ) : activeAssignments.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                        <UserCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{item.evaluateeName}</h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">
                                            {item.type.replace(/-/g, " ")} Evaluation
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={`/dashboard/evaluations/${item.periodId}/${item.id}`}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950"
                                >
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Sidebar Info */}
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Resources</h2>
                    <div className="rounded-3xl bg-zinc-900 p-6 text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <h3 className="text-lg font-semibold">Evaluation Guide</h3>
                        <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
                            Learn how to provide constructive feedback that helps our team grow.
                        </p>
                        <Link
                            href="/dashboard/guide"
                            className="mt-6 flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Read Guide
                        </Link>
                    </div>

                    <div className="rounded-3xl border border-dashed border-zinc-200 p-6 dark:border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Need Help?</h3>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Contact the HR department for any questions regarding the evaluation process.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

function UserCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 20.662V19c0-1.657 2.239-3 5-3s5 1.343 5 3v1.662" />
        </svg>
    );
}
