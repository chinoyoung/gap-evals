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
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    TrendingUp,
    MessageSquare,
    ChevronDown,
    ChevronRight,
    Star,
    Clock,
    User,
    BarChart3
} from "lucide-react";

interface Evaluation {
    id: string;
    assignmentId: string;
    evaluateeId: string;
    evaluateeName: string;
    responses: Record<string, any>;
    submittedAt: any;
    shared?: boolean;
    type?: string; // We'll try to infer this or fetch from assignments
}

interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    order?: number;
}

interface GroupedResult {
    type: string;
    count: number;
    averages: Record<string, number>;
    comments: Record<string, string[]>;
    lastSubmitted: any;
}

export default function MyResultsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [groupedResults, setGroupedResults] = useState<Record<string, GroupedResult>>({});
    const [expandedType, setExpandedType] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // Fetch questions and evaluations in parallel
            const [questSnap, evalSnap] = await Promise.all([
                getDocs(collection(db, "questions")),
                getDocs(query(
                    collection(db, "evaluations"),
                    where("shared", "==", true)
                ))
            ]);

            const qs = questSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            setQuestions(qs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));

            // Filter by user ID or Name (fallback for legacy evaluations without evaluateeId)
            const evals = evalSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Evaluation))
                .filter(ev =>
                    ev.evaluateeId === user?.uid ||
                    (ev.evaluateeName === user?.displayName && !ev.evaluateeId)
                )
                .sort((a, b) => {
                    const timeA = a.submittedAt?.toMillis?.() || 0;
                    const timeB = b.submittedAt?.toMillis?.() || 0;
                    return timeB - timeA;
                });

            // Group by type
            const groups: Record<string, GroupedResult> = {};

            evals.forEach(ev => {
                // Prefer the type stored on the evaluation, fallback to assignment lookup if possible
                const type = ev.type || "Peer Feedback"; // Default fallback

                if (!groups[type]) {
                    groups[type] = {
                        type,
                        count: 0,
                        averages: {},
                        comments: {},
                        lastSubmitted: ev.submittedAt
                    };
                }

                const g = groups[type];
                g.count++;

                Object.entries(ev.responses).forEach(([qId, val]) => {
                    const question = qs.find(q => q.id === qId);
                    if (!question) return;

                    if (question.type === "scale") {
                        if (val !== "N/A" && typeof val === "number") {
                            g.averages[qId] = (g.averages[qId] || 0) + val;
                        }
                    } else {
                        if (val && typeof val === "string") {
                            if (!g.comments[qId]) g.comments[qId] = [];
                            g.comments[qId].push(val);
                        }
                    }
                });
            });

            // Calculate final averages
            Object.values(groups).forEach(g => {
                Object.keys(g.averages).forEach(qId => {
                    // This is a simple average of scales that were not N/A
                    // Note: This doesn't account for how many people chose N/A vs 0-10
                    // But usually all evaluators answer or all don't.
                    g.averages[qId] = parseFloat((g.averages[qId] / g.count).toFixed(1));
                });
            });

            setGroupedResults(groups);
            if (Object.keys(groups).length > 0) {
                setExpandedType(Object.keys(groups)[0]);
            }
        } catch (error) {
            console.error("Error fetching my results", error);
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

    if (Object.keys(groupedResults).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                    <BarChart3 className="h-10 w-10" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">No Shared Results Yet</h1>
                <p className="mt-2 max-w-sm text-zinc-500">
                    Once administrators share your evaluation feedback, it will appear here for you to review anonymously.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">My Performance Feedback</h1>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                    Aggregated and anonymized insights from your team and managers.
                </p>
            </header>

            <div className="space-y-6">
                {Object.values(groupedResults).map((group) => (
                    <div
                        key={group.type}
                        className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                    >
                        <button
                            onClick={() => setExpandedType(expandedType === group.type ? null : group.type)}
                            className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold capitalize text-zinc-900 dark:text-zinc-50">
                                        {group.type.replace(/-/g, " ")} Feedback
                                    </h3>
                                    <p className="text-xs font-medium text-zinc-500">
                                        Based on {group.count} anonymous {group.count === 1 ? 'evaluation' : 'evaluations'}
                                    </p>
                                </div>
                            </div>
                            {expandedType === group.type ? <ChevronDown className="h-5 w-5 text-zinc-400" /> : <ChevronRight className="h-5 w-5 text-zinc-400" />}
                        </button>

                        <AnimatePresence>
                            {expandedType === group.type && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto" }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                                >
                                    <div className="p-8 space-y-10">
                                        {/* Scale Averages */}
                                        {questions.filter(q => q.type === "scale").length > 0 && (
                                            <div className="space-y-6">
                                                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
                                                    <TrendingUp className="h-4 w-4" />
                                                    Aggregated Ratings
                                                </h4>
                                                <div className="grid gap-6 sm:grid-cols-2">
                                                    {questions.filter(q => q.type === "scale").map(q => {
                                                        const avg = group.averages[q.id];
                                                        if (avg === undefined) return null;
                                                        return (
                                                            <div key={q.id} className="space-y-3">
                                                                <div className="flex justify-between items-end">
                                                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 pr-4 leading-snug">
                                                                        {q.text}
                                                                    </p>
                                                                    <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">
                                                                        {avg}
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${avg * 10}%` }}
                                                                        className="h-full bg-zinc-900 dark:bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Paragraph Comments */}
                                        {questions.filter(q => q.type === "paragraph").length > 0 && (
                                            <div className="space-y-6">
                                                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
                                                    <MessageSquare className="h-4 w-4" />
                                                    Constructive Feedback
                                                </h4>
                                                <div className="space-y-8">
                                                    {questions.filter(q => q.type === "paragraph").map(q => {
                                                        const comments = group.comments[q.id];
                                                        if (!comments || comments.length === 0) return null;
                                                        return (
                                                            <div key={q.id} className="space-y-4">
                                                                <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                                                                    {q.text}
                                                                </h5>
                                                                <div className="space-y-3 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                                                                    {comments.map((comment, i) => (
                                                                        <div key={i} className="relative rounded-2xl bg-zinc-50/50 p-4 dark:bg-zinc-800/30">
                                                                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                                                                "{comment}"
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="rounded-2xl bg-zinc-900 p-6 text-white dark:bg-white dark:text-zinc-950">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center dark:bg-zinc-900/10">
                                                    <Star className="h-5 w-5 text-amber-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">Confidential & Anonymous</p>
                                                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                                        These results have been aggregated to protect the privacy of your evaluators.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}
