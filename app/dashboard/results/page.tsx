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
    Search,
    Archive,
    Calendar,
    ArchiveRestore,
    ChevronRight,
    ChevronDown,
    CheckSquare,
    Square,
    RotateCcw,
    Share2
} from "lucide-react";

interface Evaluation {
    id: string;
    assignmentId: string;
    evaluatorId: string;
    evaluatorName?: string;
    evaluateeName: string;
    responses: Record<string, any>;
    submittedAt: any;
    archived?: boolean;
    shared?: boolean;
    evaluateeId?: string;
    periodId?: string;
    periodName?: string;
}

interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    order?: number;
}

export default function ResultsPage() {
    const { role } = useAuth();
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selection, setSelection] = useState<Set<string>>(new Set());

    const filteredEvaluations = evaluations.filter(ev =>
        (ev.evaluateeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.evaluatorName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (!selectedPeriodId || ev.periodId === selectedPeriodId)
    );

    const selectedEvaluation = evaluations.find(ev => ev.id === selectedId);

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriodId) {
            fetchData();
        }
    }, [selectedPeriodId]);

    const fetchPeriods = async () => {
        try {
            const snap = await getDocs(query(collection(db, "periods"), orderBy("createdAt", "desc")));
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            const sorted = data.sort((a, b) => {
                if (a.archived && !b.archived) return 1;
                if (!a.archived && b.archived) return -1;
                return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
            });
            setPeriods(sorted);
            if (sorted.length > 0) {
                // Find first non-archived if possible
                const firstActive = sorted.find(p => !p.archived) || sorted[0];
                setSelectedPeriodId(firstActive.id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching periods:", error);
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch evaluations for this period
            const evalSnap = await getDocs(query(
                collection(db, "evaluations"),
                where("periodId", "==", selectedPeriodId),
                orderBy("submittedAt", "desc")
            ));

            // Fetch questions for this period
            const questSnap = await getDocs(query(
                collection(db, `periods/${selectedPeriodId}/questions`),
                orderBy("order", "asc")
            ));

            setEvaluations(evalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation)));
            setQuestions(questSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
        } catch (error) {
            console.error("Error fetching results", error);
        } finally {
            setLoading(false);
        }
    };


    const toggleSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelection = new Set(selection);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelection(newSelection);
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
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Evaluation Results</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Review all submitted feedback and performance data.</p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <select
                                value={selectedPeriodId}
                                onChange={(e) => setSelectedPeriodId(e.target.value)}
                                className="w-full appearance-none rounded-2xl border-none bg-white pl-11 pr-10 py-3 text-sm shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:ring-zinc-800 dark:focus:ring-zinc-100 cursor-pointer min-w-[200px]"
                            >
                                <option value="">All Periods</option>
                                {periods.map(p => (
                                    <option key={p.id} value={p.id}>{p.archived ? `[Archived] ${p.name}` : p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>

                        {selectedPeriodId && periods.find(p => p.id === selectedPeriodId) && (
                            <button
                                onClick={async () => {
                                    const p = periods.find(p => p.id === selectedPeriodId);
                                    const newStatus = !p.resultsPublished;
                                    if (confirm(newStatus ? "This will make all results for this period visible to employees. Continue?" : "This will hide results from employees. Continue?")) {
                                        try {
                                            const { updateDoc, doc } = await import("firebase/firestore");
                                            await updateDoc(doc(db, "periods", selectedPeriodId), {
                                                resultsPublished: newStatus
                                            });
                                            fetchPeriods();
                                        } catch (err) {
                                            console.error("Error toggling results status", err);
                                        }
                                    }
                                }}
                                className={`flex items-center gap-2 shrink-0 rounded-2xl px-6 py-3 text-sm font-bold transition-all shadow-sm ${periods.find(p => p.id === selectedPeriodId)?.resultsPublished
                                    ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                    : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    }`}
                            >
                                <Share2 className="h-4 w-4" />
                                {periods.find(p => p.id === selectedPeriodId)?.resultsPublished ? "Results Published" : "Publish Results"}
                            </button>
                        )}
                    </div>

                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="search"
                            placeholder="Search by reviewee..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-2xl border-none bg-white px-11 py-3 text-sm shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:ring-zinc-800 dark:focus:ring-zinc-100"
                        />
                    </div>
                </div>
            </div>

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
                    <div className="space-y-12">

                        {/* Active Evaluations */}
                        <div className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredEvaluations.map((ev) => (
                                    <motion.div
                                        layoutId={ev.id}
                                        key={ev.id}
                                        onClick={() => setSelectedId(ev.id)}
                                        className="group relative flex flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 text-left cursor-pointer"
                                    >
                                        <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900/5 dark:bg-white/5">
                                                <ExternalLink className="h-5 w-5 text-zinc-400" />
                                            </div>
                                        </div>
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

                                        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                            <span>Click to View Detailed Results</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
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
                                        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900 flex flex-col"
                                    >
                                        <header className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
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

                                        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                                            <div className="space-y-7">
                                                {questions.map((q) => (
                                                    <div key={q.id} className="space-y-3">
                                                        <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                                                            {q.text}
                                                        </h5>
                                                        <div className="rounded-2xl bg-zinc-50/50 p-4 ring-1 ring-zinc-100 dark:bg-zinc-800/30 dark:ring-zinc-800">
                                                            {q.type === 'scale' ? (
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-white dark:bg-white dark:text-zinc-950 shadow-lg shadow-zinc-900/10 dark:shadow-none">
                                                                            {selectedEvaluation.responses[q.id] || "N/A"}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
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
                                                                    {selectedEvaluation.responses[`${q.id}_comment`] && (
                                                                        <div className="mt-2 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                                                                            <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
                                                                                "{selectedEvaluation.responses[`${q.id}_comment`]}"
                                                                            </p>
                                                                        </div>
                                                                    )}
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
                    </div>
                </>
            )}
        </div>
    );
}
