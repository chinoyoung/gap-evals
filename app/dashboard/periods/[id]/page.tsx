"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    collection,
    getDocs,
    query,
    orderBy,
    writeBatch,
    addDoc,
    deleteDoc,
    where
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    Settings,
    FileText,
    Users,
    ChevronLeft,
    Save,
    Send,
    AlertCircle,
    CheckCircle2,
    Check,
    Calendar,
    Plus,
    Trash2,
    Edit2,
    Hash,
    Type,
    GripVertical,
    Search,
    UserPlus,
    RotateCcw,
    X,
    CheckSquare,
    Square
} from "lucide-react";
import Link from "next/link";

// Reuse components from old questions page if possible, but keep local for simplicity for now
import { QuestionItem, Question } from "@/components/ui/QuestionItem";

interface User {
    uid: string;
    displayName: string;
    email: string;
    department?: string;
}

interface Assignment {
    id: string;
    evaluatorId: string;
    evaluatorName: string;
    evaluateeId: string;
    evaluateeName: string;
    status: string;
    type: "Peer to Peer" | "Manager to Employee" | "Employee to Manager" | "Self";
}

export default function PeriodDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { role } = useAuth();

    const [period, setPeriod] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"settings" | "questions" | "assignments">("settings");
    const [isSaving, setIsSaving] = useState(false);

    // Settings State
    const [settingName, setSettingName] = useState("");
    const [settingDesc, setSettingDesc] = useState("");
    const [settingStart, setSettingStart] = useState("");
    const [settingEnd, setSettingEnd] = useState("");

    // Questions State (Period Specific)
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [qText, setQText] = useState("");
    const [qType, setQType] = useState<"scale" | "paragraph">("scale");
    const [qScope, setQScope] = useState<"all" | "self">("all");
    const [editingQId, setEditingQId] = useState<string | null>(null);

    // Global Library Import State
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [globalQuestions, setGlobalQuestions] = useState<Question[]>([]);
    const [selectedGlobalIds, setSelectedGlobalIds] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);

    // Assignments State (Period Specific)
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isAddingAssignment, setIsAddingAssignment] = useState(false);
    const [selectedEvaluator, setSelectedEvaluator] = useState("");
    const [selectedEvaluatee, setSelectedEvaluatee] = useState("");
    const [assignType, setAssignType] = useState<Assignment["type"]>("Peer to Peer");

    // Bulk Wizard State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkReviewees, setBulkReviewees] = useState<Set<string>>(new Set());
    const [bulkReviewers, setBulkReviewers] = useState<Set<string>>(new Set());
    const [bulkType, setBulkType] = useState<Assignment["type"]>("Peer to Peer");
    const [bulkSearch, setBulkSearch] = useState("");
    const [bulkDept, setBulkDept] = useState("All");
    const [isGenerating, setIsGenerating] = useState(false);

    // Assignment Selection State
    const [assignmentSelection, setAssignmentSelection] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (id) {
            fetchPeriod();
            fetchSubData();
        }
    }, [id]);

    const fetchPeriod = async () => {
        try {
            const snap = await getDoc(doc(db, "periods", id as string));
            if (snap.exists()) {
                const data = snap.data();
                setPeriod({ id: snap.id, ...data });
                setSettingName(data.name || "");
                setSettingDesc(data.description || "");
                setSettingStart(data.startDate || "");
                setSettingEnd(data.endDate || "");
            }
        } catch (error) {
            console.error("Error fetching period:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubData = async () => {
        try {
            // Fetch period-specific questions
            const qSnap = await getDocs(query(collection(db, `periods/${id}/questions`), orderBy("order", "asc")));
            setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));

            // Fetch period-specific assignments
            const aSnap = await getDocs(collection(db, `periods/${id}/assignments`));
            setAssignments(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));

            // Fetch users for assignments
            const uSnap = await getDocs(collection(db, "users"));
            setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
        } catch (error) {
            console.error("Error fetching sub-data:", error);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "periods", id as string), {
                name: settingName,
                description: settingDesc,
                startDate: settingStart,
                endDate: settingEnd,
                updatedAt: Timestamp.now()
            });
            setPeriod({ ...period, name: settingName, description: settingDesc, startDate: settingStart, endDate: settingEnd });
        } catch (error) {
            console.error("Error saving settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!confirm("Publishing will make this period live for all assigned users. You can still edit it later, but users will be able to submit evaluations. Continue?")) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "periods", id as string), {
                status: 'published',
                updatedAt: Timestamp.now()
            });
            setPeriod({ ...period, status: 'published' });
        } catch (error) {
            console.error("Error publishing:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuestionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qText.trim()) return;

        try {
            if (editingQId) {
                await updateDoc(doc(db, `periods/${id}/questions`, editingQId), {
                    text: qText,
                    type: qType,
                    scope: qScope
                });
            } else {
                await addDoc(collection(db, `periods/${id}/questions`), {
                    text: qText,
                    type: qType,
                    scope: qScope,
                    order: questions.length,
                    createdAt: Timestamp.now()
                });
            }
            setQText("");
            setEditingQId(null);
            setIsAddingQuestion(false);
            fetchSubData();
        } catch (error) {
            console.error("Error saving question:", error);
        }
    };

    const handleDeleteQuestion = async (qId: string) => {
        if (!confirm("Delete this question?")) return;
        try {
            await deleteDoc(doc(db, `periods/${id}/questions`, qId));
            fetchSubData();
        } catch (error) {
            console.error("Error deleting question:", error);
        }
    };

    const handleAssignmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const evaluatorId = selectedEvaluator;
        const evaluateeId = assignType === "Self" ? selectedEvaluator : selectedEvaluatee;

        if (!evaluatorId || !evaluateeId) return;

        const evaluator = users.find(u => u.uid === evaluatorId);
        const evaluatee = users.find(u => u.uid === evaluateeId);

        try {
            await addDoc(collection(db, `periods/${id}/assignments`), {
                periodId: id,
                periodName: period.name,
                evaluatorId: evaluatorId,
                evaluatorName: evaluator?.displayName || "Unknown",
                evaluateeId: evaluateeId,
                evaluateeName: evaluatee?.displayName || "Unknown",
                type: assignType,
                status: "pending",
                createdAt: Timestamp.now()
            });
            setSelectedEvaluator("");
            setSelectedEvaluatee("");
            setIsAddingAssignment(false);
            fetchSubData();
        } catch (error) {
            console.error("Error saving assignment:", error);
        }
    };

    const handleDeleteAssignment = async (aId: string) => {
        if (!confirm("Remove this assignment?")) return;
        try {
            await deleteDoc(doc(db, `periods/${id}/assignments`, aId));
            fetchSubData();
        } catch (error) {
            console.error("Error deleting assignment:", error);
        }
    };

    const handleBulkSubmit = async () => {
        if (bulkReviewees.size === 0 || (bulkType !== "Self" && bulkReviewers.size === 0)) return;
        setIsGenerating(true);
        try {
            const batch = writeBatch(db);
            const revieweeIds = Array.from(bulkReviewees);
            const reviewerIds = Array.from(bulkReviewers);

            revieweeIds.forEach(targetId => {
                const target = users.find(u => u.uid === targetId);

                if (bulkType === "Self") {
                    const newRef = doc(collection(db, `periods/${id}/assignments`));
                    batch.set(newRef, {
                        periodId: id,
                        periodName: period.name,
                        evaluatorId: targetId,
                        evaluatorName: target?.displayName || "Unknown",
                        evaluateeId: targetId,
                        evaluateeName: target?.displayName || "Unknown",
                        type: "Self",
                        status: "pending",
                        createdAt: Timestamp.now()
                    });
                } else {
                    reviewerIds.forEach(evalId => {
                        // Avoid duplicates if possible or if they are the same person except if intended
                        // Here we just build the assignments
                        const evaluator = users.find(u => u.uid === evalId);
                        const newRef = doc(collection(db, `periods/${id}/assignments`));
                        batch.set(newRef, {
                            periodId: id,
                            periodName: period.name,
                            evaluatorId: evalId,
                            evaluatorName: evaluator?.displayName || "Unknown",
                            evaluateeId: targetId,
                            evaluateeName: target?.displayName || "Unknown",
                            type: bulkType,
                            status: "pending",
                            createdAt: Timestamp.now()
                        });
                    });
                }
            });

            await batch.commit();
            setShowBulkModal(false);
            setBulkReviewees(new Set());
            setBulkReviewers(new Set());
            fetchSubData();
        } catch (error) {
            console.error("Error in bulk assignment:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBatchDeleteAssignments = async () => {
        if (assignmentSelection.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${assignmentSelection.size} assignments?`)) return;

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            assignmentSelection.forEach(aId => {
                batch.delete(doc(db, `periods/${id}/assignments`, aId));
            });
            await batch.commit();
            setAssignmentSelection(new Set());
            fetchSubData();
        } catch (error) {
            console.error("Error batch deleting assignments:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const fetchGlobalQuestions = async () => {
        try {
            const snap = await getDocs(query(collection(db, "questions"), orderBy("order", "asc")));
            setGlobalQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
        } catch (error) {
            console.error("Error fetching global questions:", error);
        }
    };

    const handleImportSelected = async () => {
        if (selectedGlobalIds.size === 0) return;
        setImporting(true);
        try {
            const batch = writeBatch(db);
            const toImport = globalQuestions.filter(q => selectedGlobalIds.has(q.id));

            toImport.forEach((q, index) => {
                const newRef = doc(collection(db, `periods/${id}/questions`));
                batch.set(newRef, {
                    text: q.text,
                    type: q.type,
                    scope: q.scope || "all",
                    order: questions.length + index,
                    createdAt: Timestamp.now()
                });
            });

            await batch.commit();
            setShowLibraryModal(false);
            setSelectedGlobalIds(new Set());
            fetchSubData();
        } catch (error) {
            console.error("Error importing questions:", error);
        } finally {
            setImporting(false);
        }
    };

    const toggleGlobalSelection = (qId: string) => {
        const next = new Set(selectedGlobalIds);
        if (next.has(qId)) next.delete(qId);
        else next.add(qId);
        setSelectedGlobalIds(next);
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
        );
    }

    if (!period) {
        return (
            <div className="py-20 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
                <h2 className="text-xl font-bold">Period not found</h2>
                <Link href="/dashboard/periods" className="mt-4 text-zinc-900 underline">Back to Periods</Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/periods"
                        className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-all dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{period.name}</h1>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${period.status === 'published'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                }`}>
                                {period.status}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-500">Cycle Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {period.status === 'draft' && (
                        <button
                            onClick={handlePublish}
                            disabled={isSaving}
                            className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            Publish Period
                        </button>
                    )}
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide">
                {[
                    { id: "settings", label: "Overview", icon: Settings },
                    { id: "questions", label: `Questions (${questions.length})`, icon: FileText },
                    { id: "assignments", label: `Assignments (${assignments.length})`, icon: Users },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`group flex min-w-fit items-center gap-2 border-b-2 px-6 py-4 text-sm font-semibold transition-all cursor-pointer ${activeTab === tab.id
                            ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50"
                            : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            }`}
                    >
                        <tab.icon className={`h-4 w-4 transition-colors ${activeTab === tab.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-300 group-hover:text-zinc-500"}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className="min-h-[400px]">
                {activeTab === "settings" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-8">
                        <section className="space-y-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            <div className="space-y-4">
                                <label className="text-sm font-bold uppercase tracking-widest text-zinc-400">Basic Information</label>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Period Name</label>
                                    <input
                                        value={settingName}
                                        onChange={(e) => setSettingName(e.target.value)}
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Start Date</label>
                                        <input
                                            type="date"
                                            value={settingStart}
                                            onChange={(e) => setSettingStart(e.target.value)}
                                            className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">End Date</label>
                                        <input
                                            type="date"
                                            value={settingEnd}
                                            onChange={(e) => setSettingEnd(e.target.value)}
                                            className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                        rows={4}
                                        value={settingDesc}
                                        onChange={(e) => setSettingDesc(e.target.value)}
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl bg-emerald-50 p-8 border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20">
                            <div className="flex gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-emerald-900 dark:text-emerald-400">Current Status: {period.status}</h3>
                                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-500/80">
                                        {period.status === 'draft'
                                            ? "This period is in draft mode. Only admins can see it. Questions and assignments can be changed freely."
                                            : "This period is published. Allocated users can now see and perform their evaluations."}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </motion.div>
                )}

                {activeTab === "questions" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setEditingQId(null);
                                        setQText("");
                                        setIsAddingQuestion(true);
                                    }}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Question
                                </button>
                                <button
                                    onClick={() => {
                                        fetchGlobalQuestions();
                                        setShowLibraryModal(true);
                                    }}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800 dark:hover:bg-zinc-800"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Select from Library
                                </button>
                            </div>
                        </div>

                        {isAddingQuestion && (
                            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                                <form onSubmit={handleQuestionSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{editingQId ? "Edit Question" : "New Question"}</label>
                                        <input
                                            autoFocus
                                            value={qText}
                                            onChange={(e) => setQText(e.target.value)}
                                            placeholder="Question text..."
                                            className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-zinc-100"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Field Type</label>
                                            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => setQType("scale")}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${qType === "scale" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500"}`}
                                                >
                                                    <Hash className="h-3.5 w-3.5" /> Scale
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setQType("paragraph")}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${qType === "paragraph" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500"}`}
                                                >
                                                    <Type className="h-3.5 w-3.5" /> Text
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-span-2 pt-2">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div
                                                    onClick={() => setQScope(qScope === "self" ? "all" : "self")}
                                                    className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${qScope === "self"
                                                        ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950"
                                                        : "border-zinc-200 group-hover:border-zinc-400 dark:border-zinc-700 dark:group-hover:border-zinc-500"
                                                        }`}
                                                >
                                                    {qScope === "self" && <Check className="h-4 w-4" strokeWidth={3} />}
                                                </div>
                                                <div onClick={() => setQScope(qScope === "self" ? "all" : "self")}>
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Self-Evaluation Only</p>
                                                    <p className="text-xs text-zinc-500">This question will only be shown to the person evaluating themselves.</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setIsAddingQuestion(false)} className="px-4 py-2 text-sm text-zinc-500 cursor-pointer">Cancel</button>
                                        <button type="submit" className="rounded-xl bg-zinc-900 px-6 py-2 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950 cursor-pointer">
                                            {editingQId ? "Update" : "Save"} Question
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            {questions.length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-zinc-500">No questions defined for this period.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {questions.map((q) => (
                                        <QuestionItem
                                            key={q.id}
                                            question={q}
                                            showGrip
                                            onEdit={(q) => {
                                                setQText(q.text);
                                                setQType(q.type);
                                                setEditingQId(q.id);
                                                setIsAddingQuestion(true);
                                            }}
                                            onDelete={handleDeleteQuestion}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === "assignments" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsAddingAssignment(true)}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 dark:hover:bg-zinc-800"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    New Assignment
                                </button>
                                <button
                                    onClick={() => setShowBulkModal(true)}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                                >
                                    <Users className="h-4 w-4" />
                                    Bulk Wizard
                                </button>
                                {assignmentSelection.size > 0 && (
                                    <button
                                        onClick={handleBatchDeleteAssignments}
                                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Selected ({assignmentSelection.size})
                                    </button>
                                )}
                            </div>
                        </div>

                        {isAddingAssignment && (
                            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                                <form onSubmit={handleAssignmentSubmit} className="space-y-8">
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{assignType === "Self" ? "Select User" : "Evaluator"}</label>
                                            <select
                                                required
                                                value={selectedEvaluator}
                                                onChange={(e) => setSelectedEvaluator(e.target.value)}
                                                className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                            >
                                                <option value="">Select User...</option>
                                                {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                                            </select>
                                        </div>
                                        {assignType !== "Self" && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Evaluatee (Reviewee)</label>
                                                <select
                                                    required
                                                    value={selectedEvaluatee}
                                                    onChange={(e) => setSelectedEvaluatee(e.target.value)}
                                                    className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                                >
                                                    <option value="">Select User...</option>
                                                    {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-sm font-medium">Evaluation Relationship</label>
                                        <div className="flex flex-wrap gap-3">
                                            {["Peer to Peer", "Manager to Employee", "Employee to Manager", "Self"].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setAssignType(t as any)}
                                                    className={`rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${assignType === t
                                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                                                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                                        <button type="button" onClick={() => setIsAddingAssignment(false)} className="px-4 py-2 text-sm text-zinc-500 cursor-pointer">Cancel</button>
                                        <button type="submit" className="rounded-xl bg-zinc-900 px-8 py-2.5 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950 cursor-pointer">
                                            Create Assignment
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            {assignments.length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-zinc-500">No assignments created for this period.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/20">
                                            <th className="px-6 py-4 w-10">
                                                <button
                                                    onClick={() => {
                                                        if (assignmentSelection.size === assignments.length) {
                                                            setAssignmentSelection(new Set());
                                                        } else {
                                                            setAssignmentSelection(new Set(assignments.map(a => a.id)));
                                                        }
                                                    }}
                                                    className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                                                >
                                                    {assignmentSelection.size === assignments.length && assignments.length > 0 ? (
                                                        <CheckSquare className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
                                                    ) : (
                                                        <Square className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-6 py-4">Evaluator</th>
                                            <th className="px-6 py-4">Evaluatee</th>
                                            <th className="px-6 py-4">Relationship</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {assignments.map((a) => (
                                            <tr
                                                key={a.id}
                                                onClick={() => {
                                                    const next = new Set(assignmentSelection);
                                                    if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                                                    setAssignmentSelection(next);
                                                }}
                                                className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${assignmentSelection.has(a.id) ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
                                                        {assignmentSelection.has(a.id) ? (
                                                            <CheckSquare className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
                                                        ) : (
                                                            <Square className="h-5 w-5" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.evaluatorName}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.evaluateeName}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-zinc-500">{a.type}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteAssignment(a.id);
                                                        }}
                                                        className="rounded-lg p-2 text-zinc-400 opacity-100 sm:opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Global Library Modal */}
            <AnimatePresence>
                {showLibraryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLibraryModal(false)}
                            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900 flex flex-col max-h-[80vh]"
                        >
                            <header className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Questions Library</h2>
                                    <p className="text-sm text-zinc-500 mt-1">Select questions to add to this period</p>
                                </div>
                                <button
                                    onClick={() => setShowLibraryModal(false)}
                                    className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-3">
                                    {globalQuestions.map((q) => {
                                        const isSelected = selectedGlobalIds.has(q.id);
                                        const isAlreadyInPeriod = questions.some(pq => pq.text === q.text);

                                        return (
                                            <div
                                                key={q.id}
                                                onClick={() => !isAlreadyInPeriod && toggleGlobalSelection(q.id)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isAlreadyInPeriod
                                                    ? "bg-zinc-50 border-zinc-100 opacity-60 cursor-not-allowed dark:bg-zinc-800/20 dark:border-zinc-800"
                                                    : isSelected
                                                        ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 cursor-pointer"
                                                        : "bg-white border-zinc-200 hover:border-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100 cursor-pointer"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSelected ? "bg-white/10 text-white dark:bg-black/10 dark:text-black" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                                                        }`}>
                                                        {q.type === "scale" ? <Hash className="h-5 w-5" /> : <Type className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium">{q.text}</h4>
                                                        {isAlreadyInPeriod && <p className="text-[10px] font-bold uppercase mt-1 text-emerald-600">Already in this period</p>}
                                                    </div>
                                                </div>
                                                {!isAlreadyInPeriod && (
                                                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-white dark:border-zinc-900 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" : "border-zinc-200 dark:border-zinc-700"
                                                        }`}>
                                                        {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <footer className="border-t border-zinc-100 p-6 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
                                <div className="text-sm font-medium text-zinc-500">
                                    {selectedGlobalIds.size} questions selected
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedGlobalIds(new Set(globalQuestions.filter(q => !questions.some(pq => pq.text === q.text)).map(q => q.id)))}
                                        className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={handleImportSelected}
                                        disabled={importing || selectedGlobalIds.size === 0}
                                        className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
                                    >
                                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Import Selected
                                    </button>
                                </div>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Assignment Wizard Modal */}
            <AnimatePresence>
                {showBulkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowBulkModal(false)}
                            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 flex flex-col max-h-[95vh] sm:rounded-[2.5rem]"
                        >
                            <header className="flex items-center justify-between border-b border-zinc-100 p-6 sm:p-8 dark:border-zinc-800">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bulk Assignment Wizard</h2>
                                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">Scale your review process in seconds</p>
                                </div>
                                <button
                                    onClick={() => setShowBulkModal(false)}
                                    className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800">
                                    {/* Left: Select Reviewees */}
                                    <div className="p-6 sm:p-8 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">1. Select Reviewees ({bulkReviewees.size})</h3>
                                            <button
                                                onClick={() => {
                                                    const filtered = users.filter(u => bulkDept === "All" || u.department === bulkDept);
                                                    setBulkReviewees(new Set(filtered.map(u => u.uid)));
                                                }}
                                                className="text-[9px] sm:text-[10px] font-bold uppercase text-cobalt-600 hover:underline"
                                            >
                                                Select All
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                                <input
                                                    placeholder="Search people..."
                                                    value={bulkSearch}
                                                    onChange={e => setBulkSearch(e.target.value)}
                                                    className="w-full rounded-xl bg-zinc-50 pl-9 py-2 text-xs border-none focus:ring-1 focus:ring-zinc-900 dark:bg-zinc-800"
                                                />
                                            </div>
                                            <select
                                                value={bulkDept}
                                                onChange={e => setBulkDept(e.target.value)}
                                                className="rounded-xl bg-zinc-50 border-none text-xs px-3 dark:bg-zinc-800"
                                            >
                                                <option>All</option>
                                                {Array.from(new Set(users.map(u => u.department).filter(Boolean))).map(d => (
                                                    <option key={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1 max-h-[300px] overflow-y-auto px-1">
                                            {users.filter(u =>
                                                (bulkDept === "All" || u.department === bulkDept) &&
                                                (u.displayName.toLowerCase().includes(bulkSearch.toLowerCase()))
                                            ).map(u => {
                                                const isSelected = bulkReviewees.has(u.uid);
                                                return (
                                                    <div
                                                        key={u.uid}
                                                        onClick={() => {
                                                            const next = new Set(bulkReviewees);
                                                            if (isSelected) next.delete(u.uid); else next.add(u.uid);
                                                            setBulkReviewees(next);
                                                        }}
                                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-lg" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${isSelected ? "bg-white/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>
                                                                {u.displayName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-bold">{u.displayName}</p>
                                                                <p className={`text-[9px] ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}>{u.department || "No Dept"}</p>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right: Setup Relationship & Reviewers */}
                                    <div className="p-6 sm:p-8 space-y-8 bg-zinc-50/50 dark:bg-zinc-950/20">
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">2. Define Relationship</h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                {["Peer to Peer", "Manager to Employee", "Employee to Manager", "Self"].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setBulkType(t as any)}
                                                        className={`py-2 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border transition-all ${bulkType === t ? "bg-zinc-900 text-white border-zinc-900 shadow-md dark:bg-zinc-100 dark:text-zinc-950" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:bg-zinc-900 dark:border-zinc-800"}`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {bulkType !== "Self" && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">3. Select Reviewer(s) ({bulkReviewers.size})</h3>
                                                    <button
                                                        onClick={() => setBulkReviewers(new Set())}
                                                        className="text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-600"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                                <div className="space-y-1 max-h-[250px] overflow-y-auto px-1">
                                                    {users.map(u => {
                                                        const isSelected = bulkReviewers.has(u.uid);
                                                        return (
                                                            <div
                                                                key={u.uid}
                                                                onClick={() => {
                                                                    const next = new Set(bulkReviewers);
                                                                    if (isSelected) next.delete(u.uid); else next.add(u.uid);
                                                                    setBulkReviewers(next);
                                                                }}
                                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? "bg-cobalt-600 text-white shadow-lg" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${isSelected ? "bg-white/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 text-zinc-400"}`}>
                                                                        {u.displayName.charAt(0)}
                                                                    </div>
                                                                    <p className="text-[11px] font-bold">{u.displayName}</p>
                                                                </div>
                                                                {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <footer className="border-t border-zinc-100 p-6 sm:p-8 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-zinc-900 gap-4">
                                <div>
                                    <p className="text-[10px] sm:text-xs font-medium text-zinc-500 italic">
                                        Total assignments to be created: <span className="text-zinc-900 dark:text-zinc-50 font-bold text-sm sm:text-base">
                                            {bulkType === "Self" ? bulkReviewees.size : bulkReviewees.size * bulkReviewers.size}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex w-full sm:w-auto gap-3">
                                    <button
                                        onClick={() => setShowBulkModal(false)}
                                        className="flex-1 sm:flex-none px-6 py-3 text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkSubmit}
                                        disabled={isGenerating || bulkReviewees.size === 0 || (bulkType !== "Self" && bulkReviewers.size === 0)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 py-3 text-sm font-black text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-lg"
                                    >
                                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Generate
                                    </button>
                                </div>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
