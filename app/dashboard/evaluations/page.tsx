"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
    ClipboardCheck,
    User,
    CheckCircle2,
    Clock,
    ArrowRight,
    Loader2,
    Calendar
} from "lucide-react";
import Link from "next/link";

interface Assignment {
    id: string;
    periodId: string;
    periodName: string;
    evaluatorId: string;
    evaluateeId: string;
    evaluateeName: string;
    type: string;
    status: "pending" | "completed";
    createdAt: any;
}

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";

interface Assignment {
    id: string;
    periodId: string;
    periodName: string;
    evaluatorId: string;
    evaluateeId: string;
    evaluateeName: string;
    type: string;
    status: "pending" | "completed";
    createdAt: any;
}

export default function EvaluationsPage() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchAssignments();
        }
    }, [user]);

    const fetchAssignments = async () => {
        try {
            const periodsSnap = await getDocs(query(
                collection(db, "periods"),
                where("status", "==", "published"),
                where("archived", "!=", true)
            ));

            const periodIds = periodsSnap.docs.map(d => d.id);
            const allAssignments: Assignment[] = [];

            for (const pid of periodIds) {
                const aSnap = await getDocs(query(
                    collection(db, `periods/${pid}/assignments`),
                    where("evaluatorId", "==", user?.uid)
                ));
                allAssignments.push(...aSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Assignment)));
            }

            const usersSnap = await getDocs(collection(db, "users"));
            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            setAssignments(allAssignments.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
            }));
        } catch (error) {
            console.error("Error fetching assignments", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="My Evaluations"
                description="Complete review processes assigned to you."
            />

            {loading ? (
                <Loading className="py-20" />
            ) : assignments.length === 0 ? (
                <EmptyState
                    icon={ClipboardCheck}
                    title="All caught up!"
                    description="You don't have any pending evaluation assignments at the moment."
                />
            ) : (
                <div className="grid gap-6">
                    {assignments.map((a, i) => (
                        <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Card className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                                <div className="flex items-center gap-6">
                                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${a.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                        } dark:bg-zinc-800 transition-colors group-hover:scale-105 duration-300`}>
                                        {a.status === 'completed' ? <CheckCircle2 className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-4">
                                            <Avatar
                                                src={users.find(u => u.id === a.evaluateeId)?.photoURL}
                                                name={a.evaluateeName}
                                                size="md"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                        {a.evaluateeName}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                                    <span>{users.find(u => u.id === a.evaluateeId)?.role || "Member"}</span>
                                                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                                    <span>{users.find(u => u.id === a.evaluateeId)?.department || "No Dept"}</span>
                                                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                                    <span className="text-zinc-500 truncate max-w-[150px]">{a.periodName}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-500">
                                            <Badge variant="zinc">
                                                {a.periodName || "Active Period"}
                                            </Badge>
                                            <span className="flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                                                <User className="h-3.5 w-3.5" /> {a.type.replace(/-/g, " ")}
                                            </span>
                                            <span className="flex items-center gap-1.5 grayscale opacity-70">
                                                <Calendar className="h-3.5 w-3.5" /> Assigned {a.createdAt?.toDate().toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 md:pt-0 md:border-0 justify-between md:justify-end">
                                    <Badge variant={a.status === 'completed' ? 'emerald' : 'amber'}>
                                        {a.status}
                                    </Badge>

                                    {a.status === "pending" ? (
                                        <Link
                                            href={`/dashboard/evaluations/${a.periodId}/${a.id}`}
                                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:scale-110 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            <ArrowRight className="h-6 w-6" />
                                        </Link>
                                    ) : (
                                        <div className="h-12 w-12 flex items-center justify-center">
                                            <CheckCircle2 className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
