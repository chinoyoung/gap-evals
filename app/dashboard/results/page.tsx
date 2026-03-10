"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
    doc,
    deleteDoc
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertCircle,
    Clock,
    ExternalLink,
    User,
    Search,
    ChevronDown,
    CheckSquare,
    Share2,
    Trash2
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NativeSelect as Select } from "@/components/ui/native-select";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

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
    type?: string;
}

interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    order?: number;
    scope?: "all" | "self";
}

export default function ResultsPage() {
    const { isAdmin } = useAuth();
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { success: toastSuccess, error: toastError } = useToast();

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

    const handleDelete = async () => {
        if (!selectedId) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "evaluations", selectedId));
            toastSuccess("Evaluation result deleted successfully");
            setEvaluations(prev => prev.filter(e => e.id !== selectedId));
            setSelectedId(null);
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error("Error deleting evaluation:", error);
            toastError("Failed to delete evaluation result");
        } finally {
            setIsDeleting(false);
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

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
                <p className="text-muted-foreground">Only administrators can view evaluation results.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Evaluation Results"
                description="Review all submitted feedback and performance data."
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-border">
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
                            variant={periods.find(p => p.id === selectedPeriodId)?.resultsPublished ? "success" : "default"}
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
                            <div key={group.id} className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm transition-all hover:shadow-md">
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className="flex w-full items-center justify-between p-6 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            src={users.find(u => u.id === group.id)?.photoURL}
                                            name={group.name}
                                            size="md"
                                        />
                                        <div className="text-left">
                                            <h3 className="text-lg font-bold text-foreground">{group.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="emerald">{group.evals.length} Evaluations Received</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="rounded-full bg-muted p-2 text-muted-foreground"
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
                                            <div className="border-t border-border p-6">
                                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                                    {group.evals.map((ev) => (
                                                        <Card
                                                            key={ev.id}
                                                            hoverable
                                                            onClick={() => setSelectedId(ev.id)}
                                                            className="p-6 relative flex flex-col h-full cursor-pointer isolate bg-muted/30"
                                                        >
                                                            <div className="absolute right-4 top-4 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5">
                                                                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 mb-6">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm text-muted-foreground">
                                                                    <User className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                                        {ev.type === "Self" ? "Type" : "Evaluated By"}
                                                                    </p>
                                                                    <h4 className="text-sm font-bold text-foreground">
                                                                        {ev.type === "Self" ? "Self Evaluation" : (ev.evaluatorName || "Anonymous")}
                                                                    </h4>
                                                                </div>
                                                            </div>

                                                            <div className="mt-auto space-y-3 pt-4 border-t border-border">
                                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        <span>{ev.submittedAt?.toDate().toLocaleDateString()}</span>
                                                                    </div>
                                                                    <Badge variant={getTypeColor(ev.type || "Peer").badge}>
                                                                        {ev.type || "Peer"}
                                                                    </Badge>
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

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedId && !!selectedEvaluation}
                onClose={() => setSelectedId(null)}
                title={selectedEvaluation?.evaluateeName || ""}
                description={
                    selectedEvaluation
                        ? `${selectedEvaluation.type === "Self" ? "Self Evaluation" : `By ${selectedEvaluation.evaluatorName || "Anonymous"}`} · ${selectedEvaluation.submittedAt?.toDate().toLocaleString()}`
                        : ""
                }
                maxWidth="2xl"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Delete
                        </Button>
                        <Button variant="ghost" onClick={() => setSelectedId(null)}>
                            Close
                        </Button>
                    </div>
                }
            >
                {selectedEvaluation && (
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                        <Avatar
                            src={users.find(u => u.id === selectedEvaluation.evaluateeId)?.photoURL}
                            name={selectedEvaluation.evaluateeName}
                            size="lg"
                        />
                        <Badge variant={getTypeColor(selectedEvaluation.type || "Peer").badge}>
                            {selectedEvaluation.type || "Peer"}
                        </Badge>
                    </div>
                )}

                <div className="space-y-8">
                    {selectedEvaluation && questions.map((q) => {
                        if (q.type === 'paragraph' && selectedEvaluation.type !== 'Self') {
                            return null;
                        }

                        return (
                            <div key={q.id} className="space-y-4">
                                <h5 className="text-sm font-bold text-foreground tracking-tight leading-snug">
                                    {q.text}
                                </h5>
                                <div className="rounded-lg bg-muted/50 p-6 ring-1 ring-border">
                                    {q.type === 'scale' ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-6">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-foreground text-base font-black text-background shadow-xl">
                                                    {selectedEvaluation.responses[q.id] || "N/A"}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(selectedEvaluation.responses[q.id] === "N/A" ? 0 : (selectedEvaluation.responses[q.id] || 0)) * 10}%` }}
                                                            className="h-full bg-foreground"
                                                        />
                                                    </div>
                                                    <div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                        <span>Poor</span>
                                                        <span>Average</span>
                                                        <span>Exceptional</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedEvaluation.responses[`${q.id}_comment`] && (
                                                <div className="mt-4 pl-4 border-l-2 border-border">
                                                    <p className="text-sm italic text-muted-foreground leading-relaxed">
                                                        "{selectedEvaluation.responses[`${q.id}_comment`]}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">
                                            {selectedEvaluation.responses[q.id] || "No response provided."}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Confirm Deletion"
                description="Are you sure you want to delete this evaluation result? This action cannot be undone."
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            loading={isDeleting}
                            onClick={handleDelete}
                        >
                            Delete Permanently
                        </Button>
                    </div>
                )}
            >
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="text-sm text-destructive">
                            <p className="font-bold mb-1">Warning: Irreversible Action</p>
                            <p>Deleting this record will permanently remove all associated feedback scores and comments. The evaluatee will no longer be able to see this result if it was published.</p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
