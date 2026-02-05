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

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

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
    const [users, setUsers] = useState<any[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const filteredEvaluations = evaluations.filter(ev =>
        (ev.evaluateeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.evaluatorName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (!selectedPeriodId || ev.periodId === selectedPeriodId)
    );

    const groupedResults = filteredEvaluations.reduce((acc, ev) => {
        const key = ev.evaluateeId || "unknown";
        if (!acc[key]) acc[key] = {
            id: key,
            name: ev.evaluateeName,
            evals: []
        };
        acc[key].evals.push(ev);
        return acc;
    }, {} as Record<string, { id: string; name: string; evals: Evaluation[] }>);
    const toggleGroup = (id: string) => {
        const next = new Set(expandedGroups);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedGroups(next);
    };

    const sortedGroups = Object.values(groupedResults).sort((a, b) => a.name.localeCompare(b.name));

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
            const [evalSnap, questSnap, usersSnap] = await Promise.all([
                getDocs(query(
                    collection(db, "evaluations"),
                    where("periodId", "==", selectedPeriodId),
                    orderBy("submittedAt", "desc")
                )),
                getDocs(query(
                    collection(db, `periods/${selectedPeriodId}/questions`),
                    orderBy("order", "asc")
                )),
                getDocs(collection(db, "users"))
            ]);

            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            setEvaluations(evalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation)));
            setQuestions(questSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
        } catch (error) {
            console.error("Error fetching results", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePublish = async () => {
        const p = periods.find(p => p.id === selectedPeriodId);
        if (!p) return;
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
            <PageHeader
                title="Evaluation Results"
                description="Review all submitted feedback and performance data."
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="w-64">
                        <Select
                            label="Period"
                            value={selectedPeriodId}
                            onChange={(e) => setSelectedPeriodId(e.target.value)}
                        >
                            <option value="">All Periods</option>
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.archived ? `[Archived] ${p.name}` : p.name}</option>
                            ))}
                        </Select>
                    </div>

                    {selectedPeriodId && (
                        <Button
                            variant={periods.find(p => p.id === selectedPeriodId)?.resultsPublished ? "success" : "primary"}
                            onClick={handleTogglePublish}
                            icon={Share2}
                        >
                            {periods.find(p => p.id === selectedPeriodId)?.resultsPublished ? "Results Published" : "Publish Results"}
                        </Button>
                    )}
                </div>

                <div className="w-full max-w-sm">
                    <Input
                        placeholder="Search by reviewee..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={Search}
                    />
                </div>
            </div>

            {loading ? (
                <Loading className="py-20" />
            ) : evaluations.length === 0 ? (
                <EmptyState
                    icon={CheckSquare}
                    title="No evaluations submitted"
                    description="Evaluations will appear here once submitted."
                />
            ) : filteredEvaluations.length === 0 ? (
                <EmptyState
                    icon={Search}
                    title="No results found"
                    description={`No results found for "${searchQuery}".`}
                />
            ) : (
                <div className="space-y-4">
                    {sortedGroups.map((group) => {
                        const isExpanded = expandedGroups.has(group.id);
                        return (
                            <div key={group.id} className="overflow-hidden rounded-[2rem] border border-zinc-100 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50">
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className="flex w-full items-center justify-between p-6 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            src={users.find(u => u.id === group.id)?.photoURL}
                                            name={group.name}
                                            size="md"
                                        />
                                        <div className="text-left">
                                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{group.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="emerald">{group.evals.length} Evaluations Received</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="rounded-full bg-zinc-100 p-2 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                    >
                                        <ChevronDown className="h-5 w-5" />
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                        >
                                            <div className="border-t border-zinc-100 p-6 dark:border-zinc-800">
                                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                                    {group.evals.map((ev) => (
                                                        <Card
                                                            key={ev.id}
                                                            hoverable
                                                            onClick={() => setSelectedId(ev.id)}
                                                            className="p-6 relative flex flex-col h-full cursor-pointer isolate bg-zinc-50/50 dark:bg-zinc-800/30"
                                                        >
                                                            <div className="absolute right-4 top-4 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900/5 dark:bg-white/5">
                                                                    <ExternalLink className="h-5 w-5 text-zinc-400" />
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 mb-6">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-zinc-500 dark:bg-zinc-800">
                                                                    <User className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Evaluated By</p>
                                                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                                        {ev.evaluatorName || "Anonymous"}
                                                                    </h4>
                                                                </div>
                                                            </div>

                                                            <div className="mt-auto space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        <span>{ev.submittedAt?.toDate().toLocaleDateString()}</span>
                                                                    </div>
                                                                    <Badge variant="zinc">View Details</Badge>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {selectedId && selectedEvaluation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedId(null)}
                            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
                        />
                        <motion.div
                            layoutId={selectedId}
                            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900 flex flex-col"
                        >
                            <header className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                        src={users.find(u => u.id === selectedEvaluation.evaluateeId)?.photoURL}
                                        name={selectedEvaluation.evaluateeName}
                                        size="lg"
                                        className="ring-4 ring-white dark:ring-zinc-900 shadow-xl"
                                    />
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1">
                                            {selectedEvaluation.evaluateeName}
                                        </h2>
                                        <p className="text-xs font-medium text-zinc-500 flex items-center gap-2">
                                            <span>By {selectedEvaluation.evaluatorName || "Anonymous"}</span>
                                            <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                            <span>{selectedEvaluation.submittedAt?.toDate().toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
                                    <X className="h-6 w-6" />
                                </Button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                                <div className="space-y-8">
                                    {questions.map((q) => (
                                        <div key={q.id} className="space-y-4">
                                            <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                                                {q.text}
                                            </h5>
                                            <div className="rounded-2xl bg-zinc-50 p-6 ring-1 ring-zinc-100 dark:bg-zinc-800/50 dark:ring-zinc-800">
                                                {q.type === 'scale' ? (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-base font-black text-white dark:bg-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10">
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
                                                                <div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                                                    <span>Poor</span>
                                                                    <span>Average</span>
                                                                    <span>Exceptional</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {selectedEvaluation.responses[`${q.id}_comment`] && (
                                                            <div className="mt-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                                                                <p className="text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
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
    );
}
