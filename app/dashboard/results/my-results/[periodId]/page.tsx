"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    TrendingUp,
    MessageSquare,
    ChevronDown,
    ChevronRight,
    BarChart3
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
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

export default function MyResultsDetailPage() {
    const { user } = useAuth();
    const params = useParams();
    const periodId = params.periodId as string;

    const [loading, setLoading] = useState(true);
    const [periodName, setPeriodName] = useState<string>("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [groupedResults, setGroupedResults] = useState<Record<string, GroupedResult>>({});
    const [expandedType, setExpandedType] = useState<string | null>(null);

    useEffect(() => {
        if (user && periodId) {
            fetchData();
        }
    }, [user, periodId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const periodSnap = await getDoc(doc(db, "periods", periodId));
            const periodData = periodSnap.exists() ? periodSnap.data() : null;
            setPeriodName(periodData?.name || "");
            const isPublished = periodData?.resultsPublished ?? false;

            const questSnap = await getDocs(query(
                collection(db, `periods/${periodId}/questions`),
                orderBy("order", "asc")
            ));
            const qs = questSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
            setQuestions(qs);

            const evalSnap = await getDocs(query(
                collection(db, "evaluations"),
                where("periodId", "==", periodId)
            ));

            const evals = evalSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as Evaluation))
                .filter(ev => {
                    const isForMe =
                        ev.evaluateeId === user?.uid ||
                        (ev.evaluateeName === user?.displayName && !ev.evaluateeId);
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
            console.error("Error fetching results data", error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Self': return { badge: 'blue' as const };
            case 'Manager to Member': return { badge: 'amber' as const };
            case 'Member to Manager': return { badge: 'red' as const };
            case 'Lead to Member': return { badge: 'indigo' as const };
            case 'Member to Lead': return { badge: 'indigo' as const };
            case 'Lead to Manager': return { badge: 'red' as const };
            case 'Manager to Lead': return { badge: 'amber' as const };
            default: return { badge: 'emerald' as const };
        }
    };

    if (loading) {
        return <Loading className="py-20" />;
    }

    return (
        <div className="space-y-8 pb-32">
            <div>
                <Link
                    href="/dashboard/results/my-results"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Results
                </Link>

                <PageHeader
                    title={periodName ? `${periodName} — Results` : "My Performance Feedback"}
                    description="Aggregated and anonymized insights from your team and managers."
                />
            </div>

            {Object.keys(groupedResults).length === 0 ? (
                <EmptyState
                    icon={BarChart3}
                    title="No shared results yet"
                    description="Once administrators share your evaluation feedback, it will appear here for you to review anonymously."
                    className="py-32"
                />
            ) : (
                <div className="space-y-6">
                    {Object.values(groupedResults).map((group) => (
                        <Card key={group.type} className="overflow-hidden p-0 border-border shadow-sm">
                            <button
                                onClick={() => setExpandedType(expandedType === group.type ? null : group.type)}
                                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-muted/50 cursor-pointer"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-sm">
                                        <BarChart3 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold capitalize text-foreground tracking-tight">
                                            {group.type.replace(/-/g, " ")} Feedback
                                        </h3>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Badge variant={getTypeColor(group.type).badge}>
                                                {group.count} {group.count === 1 ? 'evaluation' : 'evaluations'}
                                            </Badge>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Anonymous</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
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
                                        className="overflow-hidden border-t border-border"
                                    >
                                        <div className="p-8 space-y-12 bg-card">
                                            {/* Scale Averages */}
                                            {questions.filter(q => q.type === "scale").length > 0 && (
                                                <div className="space-y-8">
                                                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                                        <TrendingUp className="h-3.5 w-3.5" />
                                                        Aggregated Ratings
                                                    </h4>
                                                    <div className="grid gap-10 sm:grid-cols-2">
                                                        {questions.filter(q => q.type === "scale").map(q => {
                                                            const avg = group.averages[q.id];
                                                            if (avg === undefined) return null;
                                                            return (
                                                                <div key={q.id}>
                                                                    <div className="flex justify-between items-end mb-3">
                                                                        <p className="text-sm font-bold text-foreground pr-4 leading-relaxed">
                                                                            {q.text}
                                                                        </p>
                                                                        <span className="text-xl font-black text-foreground tabular-nums">
                                                                            {avg}
                                                                        </span>
                                                                    </div>
                                                                    <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${avg * 10}%` }}
                                                                            className="h-full bg-foreground rounded-full"
                                                                        />
                                                                    </div>

                                                                    {/* Scale Comments */}
                                                                    {group.comments[`${q.id}_comment`] && group.comments[`${q.id}_comment`].length > 0 && (
                                                                        <div className="mt-4 space-y-2 pl-4 border-l-2 border-border">
                                                                            {group.comments[`${q.id}_comment`].map((c, idx) => (
                                                                                <p key={idx} className="text-xs italic text-muted-foreground leading-relaxed font-medium hover:text-foreground transition-colors">
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
                                            {questions.filter(q => q.type === "paragraph").length > 0 && group.type === "Self" && (
                                                <div className="space-y-8">
                                                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        Detailed Insights
                                                    </h4>
                                                    <div className="space-y-10">
                                                        {questions.filter(q => q.type === "paragraph").map(q => {
                                                            const comments = group.comments[q.id];
                                                            if (!comments || comments.length === 0) return null;
                                                            return (
                                                                <div key={q.id} className="space-y-4">
                                                                    <h5 className="text-sm font-bold text-foreground">
                                                                        {q.text}
                                                                    </h5>
                                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                                        {comments.map((comment, i) => (
                                                                            <div key={i} className="relative rounded-lg bg-muted/50 p-5 border border-border hover:border-border/80 transition-colors">
                                                                                <p className="text-sm leading-relaxed text-muted-foreground font-medium">
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
            )}
        </div>
    );
}
