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

    useEffect(() => {
        if (user) {
            fetchAssignments();
        }
    }, [user]);

    const fetchAssignments = async () => {
        try {
            const q = query(
                collection(db, "assignments"),
                where("evaluatorId", "==", user?.uid),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        } catch (error) {
            console.error("Error fetching assignments", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">My Evaluations</h1>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">Complete review processes assigned to you.</p>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                </div>
            ) : assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <ClipboardCheck className="mb-4 h-12 w-12 text-zinc-200" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">All caught up!</h3>
                    <p className="max-w-xs text-zinc-500">You don't have any pending evaluation assignments at the moment.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    {assignments.map((a, i) => (
                        <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                    } dark:bg-zinc-800`}>
                                    {a.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                                        Eval for <span className="text-zinc-900 dark:text-zinc-100">{a.evaluateeName}</span>
                                    </h4>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-medium tracking-tight">
                                        <span className="flex items-center gap-1 uppercase tracking-widest text-[10px]">
                                            <User className="h-3 w-3" /> {a.type.replace(/-/g, " ")}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> Assigned {a.createdAt?.toDate().toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 border-t border-zinc-50 pt-4 sm:border-0 sm:pt-0">
                                <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${a.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-500'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500'
                                    }`}>
                                    {a.status}
                                </div>
                                {a.status === "pending" && (
                                    <Link
                                        href={`/dashboard/evaluations/${a.id}`}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950"
                                    >
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
