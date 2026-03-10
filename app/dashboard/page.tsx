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
    UserCircle,
    Calendar,
    ArrowUpRight,
    BookOpen,

} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
    const [stats, setStats] = useState([
        { label: "Pending Evaluations", value: "0", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", trend: "+2 this week" },
        { label: "Completed", value: "0", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "+12% vs last month" },
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

                    if (data.status === "pending" && assignments.length < 5) {
                        assignments.push({
                            id: doc.id,
                            periodId: pid,
                            ...data
                        } as Assignment);
                    }
                });
            }

            const newStats = [
                { label: "Pending Evaluations", value: String(pendingCount), icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", trend: "Action Required" },
                { label: "Completed", value: String(completedCount), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "Great job!" },
            ];

            if (isAdmin) {
                const usersCount = await getCountFromServer(collection(db, "users"));
                for (const pid of periodIds) {
                    const countSnap = await getCountFromServer(collection(db, `periods/${pid}/assignments`));
                    totalAssignments += countSnap.data().count;
                }

                newStats.push(
                    { label: "Total Assignments", value: String(totalAssignments), icon: ClipboardList, color: "text-cobalt-500", bg: "bg-cobalt-500/10", trend: "System wide" },
                    { label: "Team Members", value: String(usersCount.data().count), icon: Users, color: "text-violet-500", bg: "bg-violet-500/10", trend: "Active users" }
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

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Good afternoon, {user?.displayName?.split(' ')[0]}
                    </h1>
                    <p className="mt-2 text-muted-foreground font-medium">
                        Here's what's happening in your workspace today.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-card px-4 py-2 rounded-full shadow-sm ring-1 ring-border">
                    <Calendar className="h-4 w-4" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div key={stat.label} variants={item}>
                        <Card className="p-6 relative overflow-hidden group h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn("p-3 rounded-lg transition-colors", stat.bg, stat.color)}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-1 rounded-full",
                                    stat.label.includes("Pending") ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"
                                )}>
                                    {stat.trend}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-foreground tracking-tight">
                                    {stat.value}
                                </h3>
                                <p className="text-sm font-medium text-muted-foreground mt-1">
                                    {stat.label}
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Active Assignments - Table Style */}
                <motion.div variants={item} className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-foreground">Active Assignments</h2>
                        <Link href="/dashboard/evaluations" className="text-sm font-bold text-cobalt-600 hover:text-cobalt-700 transition-colors flex items-center gap-1">
                            View all <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <Card className="overflow-hidden">
                        {activeAssignments.length === 0 ? (
                            <EmptyState
                                className="py-12"
                                icon={ClipboardList}
                                title="All caught up!"
                                description="You have no pending evaluations."
                            />
                        ) : (
                            <Table>
                                <TableHeader className="bg-muted border-b border-border">
                                    <TableRow className="border-0 hover:bg-transparent">
                                        <TableHead className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Evaluatee</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Type</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Status</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeAssignments.map((assignment) => (
                                        <TableRow key={assignment.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        src={users.find(u => u.id === assignment.evaluateeId)?.photoURL}
                                                        name={assignment.evaluateeName}
                                                        size="sm"
                                                    />
                                                    <span className="font-bold text-foreground">
                                                        {assignment.evaluateeName}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                                                    {assignment.type.replace(/-/g, " ")}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    Pending
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <Link href={`/dashboard/evaluations/${assignment.periodId}/${assignment.id}`}>
                                                    <Button size="sm" variant="secondary" className="font-bold text-xs h-8">
                                                        Evaluate
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                </motion.div>

                {/* Resources and Quick Links */}
                <div className="space-y-6">
                    <motion.div variants={item}>
                        <h2 className="text-xl font-bold text-foreground mb-4">Resources</h2>
                        <div className="grid gap-4">
                            <Card variant="glass" className="p-5 group hover:border-cobalt-200 dark:hover:border-cobalt-900 transition-colors" hoverable>
                                <Link href="/dashboard/guide" className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-cobalt-50 text-cobalt-600 dark:bg-cobalt-900/20 dark:text-cobalt-400 group-hover:bg-cobalt-500 group-hover:text-white transition-colors">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground flex items-center gap-2 group-hover:text-cobalt-600 dark:group-hover:text-cobalt-400 transition-colors">
                                            Evaluation Guide
                                            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            Best practices for giving constructive feedback to your team.
                                        </p>
                                    </div>
                                </Link>
                            </Card>

                        </div>
                    </motion.div>

                    {/* Quick Profile Snapshot if needed, or remove to keep clean */}
                </div>
            </div>
        </motion.div>
    );
}
