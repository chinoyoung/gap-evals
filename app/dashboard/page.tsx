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
    UserCircle
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";

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
                { label: "Pending Evaluations", value: String(pendingCount), icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
                { label: "Completed", value: String(completedCount), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
            ];

            if (role === "Admin") {
                const usersCount = await getCountFromServer(collection(db, "users"));
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
        return <Loading className="py-20" />;
    }

    return (
        <div className="space-y-12">
            <PageHeader
                title={`Welcome back, ${user?.displayName?.split(' ')[0]}`}
                description="Here's what's happening with your evaluations today."
            />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="p-6 group cursor-default">
                            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} dark:bg-zinc-800/50`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                                    <h3 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</h3>
                                </div>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 opacity-100 sm:opacity-0 transition-all group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-500">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-12 lg:grid-cols-3">
                <section className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Active Assignments</h2>
                        <Link href="/dashboard/evaluations" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors dark:hover:text-zinc-200">
                            View all
                        </Link>
                    </div>

                    <div className="space-y-4">
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
                                transition={{ delay: 0.3 + (i * 0.1) }}
                            >
                                <Card className="p-5 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                            <UserCircle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900 dark:text-zinc-50">{item.evaluateeName}</h4>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                                                {item.type.replace(/-/g, " ")} Evaluation
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/dashboard/evaluations/${item.periodId}/${item.id}`}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white transition-all hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950"
                                    >
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="space-y-8">
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-50 tracking-tight">Resources</h2>
                        <Card className="bg-zinc-900 p-8 text-white dark:bg-zinc-100 dark:text-zinc-950 border-none shadow-xl shadow-zinc-900/10">
                            <h3 className="text-xl font-bold tracking-tight">Evaluation Guide</h3>
                            <p className="mt-2 text-zinc-400 dark:text-zinc-500 leading-relaxed">
                                Learn how to provide constructive feedback that helps our team grow.
                            </p>
                            <Link href="/dashboard/guide" className="block mt-8">
                                <Button
                                    variant="secondary"
                                    className="w-full font-bold bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                                >
                                    Read Guide
                                </Button>
                            </Link>
                        </Card>
                    </div>

                    <div className="rounded-3xl border border-dashed border-zinc-200 p-8 dark:border-zinc-800">
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Need Help?</h3>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Contact the HR department for any questions regarding the evaluation process.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
