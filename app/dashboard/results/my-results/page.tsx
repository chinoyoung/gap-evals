"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    getDoc,
    doc,
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

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

interface Evaluation {
    id: string;
    assignmentId: string;
    evaluateeId: string;
    evaluateeName: string;
    responses: Record<string, any>;
    submittedAt: any;
    shared?: boolean;
    type?: string;
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
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
    const [expandedType, setExpandedType] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchPeriods();
        }
    }, [user]);

    useEffect(() => {
        if (selectedPeriodId) {
            fetchData();
        }
    }, [selectedPeriodId, user]);

    const fetchPeriods = async () => {
        try {
            const publishedPeriodsSnap = await getDocs(query(
                collection(db, "periods"),
                where("resultsPublished", "==", true)
            ));

            const sharedEvalSnap = await getDocs(query(
                collection(db, "evaluations"),
                where("shared", "==", true)
            ));

            const mySharedEvals = sharedEvalSnap.docs
                .map(d => d.data())
                .filter(ev =>
                    ev.evaluateeId === user?.uid ||
                    (ev.evaluateeName === user?.displayName && !ev.evaluateeId)
                );

            const sharedPeriodIds = Array.from(new Set(mySharedEvals.map(e => e.periodId).filter(Boolean)));
            const publishedPeriodIds = publishedPeriodsSnap.docs.map(d => d.id);

            const allPeriodIds = Array.from(new Set([...sharedPeriodIds, ...publishedPeriodIds]));

            if (allPeriodIds.length === 0) {
                setLoading(false);
                return;
            }

            const periodsData: any[] = [];
            for (const pid of allPeriodIds) {
                const pSnap = await getDoc(doc(db, "periods", pid as string));
                if (pSnap.exists()) {
                    periodsData.push({ id: pSnap.id, ...pSnap.data() });
                }
            }

            setPeriods(periodsData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
            if (periodsData.length > 0) {
                setSelectedPeriodId(periodsData[0].id);
            }
        } catch (error) {
            console.error("Error fetching periods for results", error);
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const periodDoc = periods.find(p => p.id === selectedPeriodId);
            const isPublished = periodDoc?.resultsPublished;

            const questSnap = await getDocs(query(
                collection(db, `periods/${selectedPeriodId}/questions`),
                orderBy("order", "asc")
            ));
            const qs = questSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            setQuestions(qs);

            const evalSnap = await getDocs(query(
                collection(db, "evaluations"),
                where("periodId", "==", selectedPeriodId)
            ));

            const evals = evalSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Evaluation))
                .filter(ev => {
                    const isForMe = ev.evaluateeId === user?.uid || (ev.evaluateeName === user?.displayName && !ev.evaluateeId);
                    return isForMe && (isPublished || ev.shared);
                })
                .sort((a, b) => {
                    const timeA = a.submittedAt?.toMillis?.() || 0;
                    const timeB = b.submittedAt?.toMillis?.() || 0;
                    return timeB - timeA;
                });

            const groups: Record<string, GroupedResult> = {};
            const responseCounts: Record<string, Record<string, number>> = {};

            evals.forEach(ev => {
                const type = ev.type || "Peer Feedback";
                if (!groups[type]) {
                    groups[type] = {
                        type,
                        count: 0,
                        averages: {},
                        comments: {},
                        lastSubmitted: ev.submittedAt
                    };
                    responseCounts[type] = {};
                }

                const g = groups[type];
                g.count++;

                Object.entries(ev.responses).forEach(([qId, val]) => {
                    const question = qs.find(q => q.id === qId);

                    if (question && question.type === "scale") {
                        if (val !== "N/A" && typeof val === "number") {
                            g.averages[qId] = (g.averages[qId] || 0) + val;
                            responseCounts[type][qId] = (responseCounts[type][qId] || 0) + 1;
                        }
                    } else if (question && question.type === "paragraph") {
                        if (val && typeof val === "string") {
                            if (!g.comments[qId]) g.comments[qId] = [];
                            g.comments[qId].push(val);
                        }
                    } else if (qId.endsWith("_comment")) {
                        const originalQId = qId.replace("_comment", "");
                        const originalQ = qs.find(q => q.id === originalQId);
                        if (originalQ && val && typeof val === "string") {
                            if (!g.comments[qId]) g.comments[qId] = [];
                            g.comments[qId].push(val);
                        }
                    }
                });
            });

            Object.values(groups).forEach(g => {
                Object.keys(g.averages).forEach(qId => {
                    const count = responseCounts[g.type][qId] || 0;
                    if (count > 0) {
                        g.averages[qId] = parseFloat((g.averages[qId] / count).toFixed(1));
                    } else {
                        delete g.averages[qId];
                    }
                });
            });

            setGroupedResults(groups);
            if (Object.keys(groups).length > 0) {
                setExpandedType(Object.keys(groups)[0]);
            } else {
                setExpandedType(null);
            }
        } catch (error) {
            console.error("Error fetching my resultsData", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loading className="py-20" />;
    }

    if (Object.keys(groupedResults).length === 0) {
        return (
            <div className="space-y-8">
                <PageHeader
                    title="My Performance Feedback"
                    description="Aggregated and anonymized insights from your team and managers."
                />
                <EmptyState
                    icon={BarChart3}
                    title="No shared results yet"
                    description="Once administrators share your evaluation feedback, it will appear here for you to review anonymously."
                    className="py-32"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader
                    title="My Performance Feedback"
                    description="Aggregated and anonymized insights from your team and managers."
                />
                {periods.length > 1 && (
                    <div className="w-full max-w-[240px]">
                        <Select
                            icon={Clock}
                            value={selectedPeriodId}
                            onChange={(e) => setSelectedPeriodId(e.target.value)}
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Select>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {Object.values(groupedResults).map((group) => (
                    <Card key={group.type} className="overflow-hidden p-0 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <button
                            onClick={() => setExpandedType(expandedType === group.type ? null : group.type)}
                            className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                        >
                            <div className="flex items-center gap-5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-lg shadow-zinc-900/10">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold capitalize text-zinc-900 dark:text-zinc-50 tracking-tight">
                                        {group.type.replace(/-/g, " ")} Feedback
                                    </h3>
                                    <div className="mt-1 flex items-center gap-2">
                                        <Badge variant="zinc">
                                            {group.count} {group.count === 1 ? 'evaluation' : 'evaluations'}
                                        </Badge>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Anonymous</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 dark:bg-zinc-800">
                                {expandedType === group.type ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </div>
                        </button>

                        <AnimatePresence>
                            {expandedType === group.type && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                                >
                                    <div className="p-8 space-y-12 bg-white dark:bg-zinc-900">
                                        {/* Scale Averages */}
                                        {questions.filter(q => q.type === "scale").length > 0 && (
                                            <div className="space-y-8">
                                                <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                                                    <TrendingUp className="h-3.5 w-3.5" />
                                                    Aggregated Ratings
                                                </h4>
                                                <div className="grid gap-10 sm:grid-cols-2">
                                                    {questions.filter(q => q.type === "scale").map(q => {
                                                        const avg = group.averages[q.id];
                                                        if (avg === undefined) return null;
                                                        return (
                                                            <div key={q.id} className="group/item">
                                                                <div className="flex justify-between items-end mb-3">
                                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 pr-4 leading-relaxed">
                                                                        {q.text}
                                                                    </p>
                                                                    <span className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">
                                                                        {avg}
                                                                    </span>
                                                                </div>
                                                                <div className="relative h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${avg * 10}%` }}
                                                                        className="h-full bg-zinc-900 dark:bg-white rounded-full"
                                                                    />
                                                                </div>

                                                                {/* Scale Comments */}
                                                                {group.comments[`${q.id}_comment`] && group.comments[`${q.id}_comment`].length > 0 && (
                                                                    <div className="mt-4 space-y-2 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                                                                        {group.comments[`${q.id}_comment`].map((c, idx) => (
                                                                            <p key={idx} className="text-xs italic text-zinc-500 leading-relaxed font-medium transition-colors hover:text-zinc-700 dark:hover:text-zinc-300">
                                                                                "{c}"
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Paragraph Comments */}
                                        {questions.filter(q => q.type === "paragraph").length > 0 && (
                                            <div className="space-y-8">
                                                <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                    Detailed Inisghts
                                                </h4>
                                                <div className="space-y-10">
                                                    {questions.filter(q => q.type === "paragraph").map(q => {
                                                        const comments = group.comments[q.id];
                                                        if (!comments || comments.length === 0) return null;
                                                        return (
                                                            <div key={q.id} className="space-y-4">
                                                                <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                                    {q.text}
                                                                </h5>
                                                                <div className="grid gap-4 sm:grid-cols-2">
                                                                    {comments.map((comment, i) => (
                                                                        <div key={i} className="relative rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                                                                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium">
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
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                ))}
            </div>
        </div>
    );
}
