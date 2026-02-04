"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    where
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart3,
    User,
    FileText,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle,
    Clock
} from "lucide-react";

interface Evaluation {
    id: string;
    assignmentId: string;
    evaluatorId: string;
    evaluateeName: string;
    responses: Record<string, any>;
    submittedAt: any;
}

interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    order?: number;
}

export default function ResultsPage() {
    const { role } = useAuth();
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [evalSnap, questSnap] = await Promise.all([
                getDocs(query(collection(db, "evaluations"), orderBy("submittedAt", "desc"))),
                getDocs(collection(db, "questions"))
            ]);

            setEvaluations(evalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation)));
            const qs = questSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            setQuestions(qs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
        } catch (error) {
            console.error("Error fetching results", error);
        } finally {
            setLoading(false);
        }
    };

    if (role !== "Admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can view evaluation results.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Evaluation Results</h1>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">Review all submitted feedback and performance data.</p>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                </div>
            ) : evaluations.length === 0 ? (
                <div className="py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-500 italic">No evaluations have been submitted yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {evaluations.map((ev) => (
                        <div
                            key={ev.id}
                            className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                        >
                            <button
                                onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                                            Evaluation for {ev.evaluateeName}
                                        </h4>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5 uppercase tracking-wider font-medium">
                                            <Clock className="h-3.5 w-3.5" />
                                            Submitted {ev.submittedAt?.toDate().toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                {expandedId === ev.id ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
                            </button>

                            <AnimatePresence>
                                {expandedId === ev.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-zinc-100 dark:border-zinc-800"
                                    >
                                        <div className="p-8 space-y-8">
                                            {questions.map((q) => (
                                                <div key={q.id} className="space-y-2">
                                                    <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tighter">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                                                        {q.text}
                                                    </h5>
                                                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                                                        {q.type === 'scale' ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white text-sm font-bold dark:bg-zinc-100 dark:text-zinc-950">
                                                                    {ev.responses[q.id] || "N/A"}
                                                                </div>
                                                                <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-1000"
                                                                        style={{ width: `${(ev.responses[q.id] || 0) * 10}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                                                                {ev.responses[q.id] || "No response provided."}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
