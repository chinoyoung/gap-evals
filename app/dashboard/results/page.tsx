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
    Loader2,
    AlertCircle,
    Clock,
    X,
    ExternalLink,
    User,
    Search
} from "lucide-react";

interface Evaluation {
    id: string;
    assignmentId: string;
    evaluatorId: string;
    evaluatorName?: string;
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
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredEvaluations = evaluations.filter(ev =>
        ev.evaluateeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.evaluatorName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedEvaluation = evaluations.find(ev => ev.id === selectedId);

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
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Evaluation Results</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Review all submitted feedback and performance data.</p>
                </div>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="search"
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-2xl border-none bg-white px-11 py-3 text-sm shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:ring-zinc-800 dark:focus:ring-zinc-100"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                </div>
            ) : evaluations.length === 0 ? (
                <div className="py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-500 italic">No evaluations have been submitted yet.</p>
                </div>
            ) : filteredEvaluations.length === 0 ? (
                <div className="py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-500 italic">No results found for "{searchQuery}".</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredEvaluations.map((ev) => (
                            <motion.button
                                layoutId={ev.id}
                                key={ev.id}
                                onClick={() => setSelectedId(ev.id)}
                                className="group flex flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 text-left"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-50 truncate">
                                            {ev.evaluateeName}
                                        </h4>
                                        <p className="text-xs text-zinc-500 font-medium">Reviewee</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                                        <User className="h-3.5 w-3.5" />
                                        <span className="truncate">By {ev.evaluatorName || "Anonymous"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{ev.submittedAt?.toDate().toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors">
                                    <span>View Detailed Results</span>
                                    <ExternalLink className="h-3 w-3" />
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {selectedId && selectedEvaluation && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedId(null)}
                                    className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
                                />
                                <motion.div
                                    layoutId={selectedId}
                                    className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-zinc-900 flex flex-col"
                                >
                                    <header className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1">
                                                    {selectedEvaluation.evaluateeName}
                                                </h2>
                                                <p className="text-xs font-medium text-zinc-500 flex items-center gap-2 mt-0.5">
                                                    <span>Results by {selectedEvaluation.evaluatorName || "Anonymous"}</span>
                                                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                                    <span>{selectedEvaluation.submittedAt?.toDate().toLocaleString()}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedId(null)}
                                            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </header>

                                    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                                        <div className="space-y-10">
                                            {questions.map((q) => (
                                                <div key={q.id} className="space-y-3">
                                                    <h5 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                                                        {q.text}
                                                    </h5>
                                                    <div className="rounded-2xl bg-zinc-50/50 p-6 ring-1 ring-zinc-100 dark:bg-zinc-800/30 dark:ring-zinc-800">
                                                        {q.type === 'scale' ? (
                                                            <div className="flex items-center gap-6">
                                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-black text-white dark:bg-white dark:text-zinc-950 shadow-lg shadow-zinc-900/10 dark:shadow-none">
                                                                    {selectedEvaluation.responses[q.id] || "N/A"}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${(selectedEvaluation.responses[q.id] === "N/A" ? 0 : (selectedEvaluation.responses[q.id] || 0)) * 10}%` }}
                                                                            className="h-full bg-zinc-900 dark:bg-white"
                                                                        />
                                                                    </div>
                                                                    <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                                                        <span>Poor</span>
                                                                        <span>Average</span>
                                                                        <span>Exceptional</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-medium">
                                                                {selectedEvaluation.responses[q.id] || "No response provided."}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
