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
    Hash,
    Type,
    Search,
    UserPlus,
    RotateCcw,
    X,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronRight,
    UserCircle
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";

// Reuse components from old questions page if possible, but keep local for simplicity for now
import { QuestionItem, Question } from "@/components/ui/QuestionItem";
import { useQuestions } from "@/hooks/useQuestions";
import { Skeleton, SkeletonCard, SkeletonQuestionItem } from "@/components/ui/Skeleton";
import { PeriodQuestions } from "./components/PeriodQuestions";

interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    departmentId?: string;
    department?: string;
    role: string;
}

interface Role {
    id: string;
    name: string;
    isAdmin?: boolean;
    canManageTeam?: boolean;
}

interface Relationship {
    id: string;
    name: string;
    reviewerRoleId: string;
    revieweeRoleId: string;
}

interface Assignment {
    id: string;
    evaluatorId: string;
    evaluatorName: string;
    evaluateeId: string;
    evaluateeName: string;
    status: string;
    type: string;
}

export default function PeriodDetailPage() {
    const { success, error: toastError } = useToast();
    const { id } = useParams();
    const router = useRouter();
    const { isAdmin } = useAuth();
    const { questions, loading: questionsLoading } = useQuestions(id as string);

    const [period, setPeriod] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"settings" | "questions" | "assignments">("settings");
    const [isSaving, setIsSaving] = useState(false);

    // Settings State
    const [settingName, setSettingName] = useState("");
    const [settingDesc, setSettingDesc] = useState("");
    const [settingStart, setSettingStart] = useState("");
    const [settingEnd, setSettingEnd] = useState("");

    // Global Library Import State

    // Global Library Import State
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [globalQuestions, setGlobalQuestions] = useState<Question[]>([]);
    const [selectedGlobalIds, setSelectedGlobalIds] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);

    // Assignments State (Period Specific)
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [compRoles, setCompRoles] = useState<Role[]>([]);
    const [roleRelationships, setRoleRelationships] = useState<Relationship[]>([]);

    // Bulk Wizard State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkReviewees, setBulkReviewees] = useState<Set<string>>(new Set());
    const [bulkReviewers, setBulkReviewers] = useState<Set<string>>(new Set());
    const [bulkType, setBulkType] = useState<string>("Peer to Peer");
    const [bulkRelId, setBulkRelId] = useState<string>("peer-default");
    const [bulkSearch, setBulkSearch] = useState("");
    const [bulkDept, setBulkDept] = useState("All");
    const [isGenerating, setIsGenerating] = useState(false);

    // Assignment Selection State
    const [assignmentSelection, setAssignmentSelection] = useState<Set<string>>(new Set());
    const [expandedEvaluators, setExpandedEvaluators] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!showBulkModal) return;

        if (bulkType === "Self") {
            setBulkReviewers(prev => {
                const next = new Set(prev);
                let changed = false;
                prev.forEach(uid => {
                    if (assignments.some(a => a.evaluatorId === uid && a.evaluateeId === uid && a.type === "Self")) {
                        next.delete(uid);
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
            setBulkReviewees(new Set());
        } else if (bulkReviewers.size > 0 && bulkRelId) {
            // Validate if selected relationship is still valid for reviewers
            let isInvalid = false;

            if (bulkRelId === "peer-default") {
                const roles = Array.from(bulkReviewers).map(id => users.find(u => u.uid === id)?.role);
                isInvalid = new Set(roles).size > 1;
            } else if (bulkRelId === "self-default") {
                isInvalid = false; // Always valid
            } else {
                const rel = roleRelationships.find(r => r.id === bulkRelId);
                if (!rel) {
                    isInvalid = true;
                } else {
                    const selectedUsers = Array.from(bulkReviewers).map(id => users.find(u => u.uid === id)).filter(Boolean);
                    const reviewerRoleObj = compRoles.find(r => r.id === rel.reviewerRoleId);
                    isInvalid = selectedUsers.some(u => u?.role !== reviewerRoleObj?.name);
                }
            }

            if (isInvalid) {
                setBulkRelId("peer-default");
                setBulkType("Peer to Peer");
                setBulkReviewees(new Set());
            }

            setBulkReviewees(prev => {
                const next = new Set(prev);
                let changed = false;
                prev.forEach(uid => {
                    const isAlreadyAssigned = Array.from(bulkReviewers).some(revId =>
                        assignments.some(a => a.evaluatorId === revId && a.evaluateeId === uid && a.type === bulkType)
                    );
                    const isSelf = bulkReviewers.has(uid);
                    if (isAlreadyAssigned || isSelf) {
                        next.delete(uid);
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [bulkType, bulkRelId, bulkReviewers, assignments, showBulkModal]);

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
            const [aSnap, uSnap, dSnap, rSnap, relSnap] = await Promise.all([
                getDocs(collection(db, `periods/${id}/assignments`)),
                getDocs(collection(db, "users")),
                getDocs(collection(db, "departments")),
                getDocs(collection(db, "roles")),
                getDocs(collection(db, "role_relationships"))
            ]);

            const deptsMap = dSnap.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data().name;
                return acc;
            }, {} as Record<string, string>);

            setAssignments(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
            setCompRoles(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as Role)));
            setRoleRelationships(relSnap.docs.map(d => ({ id: d.id, ...d.data() } as Relationship)));

            setUsers(uSnap.docs.map(d => {
                const data = d.data();
                return {
                    uid: d.id,
                    ...data,
                    department: data.departmentId ? deptsMap[data.departmentId] : undefined
                } as User;
            }));
        } catch (err) {
            console.error("Error fetching sub-data:", err);
            toastError("Failed to load required data.");
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
            success("Settings saved successfully.");
        } catch (error) {
            console.error("Error saving period:", error);
            toastError("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignAllSelf = async () => {
        if (!confirm("Assign a self-evaluation to all users who don't have one yet?")) return;
        setIsGenerating(true);
        try {
            let count = 0;
            const promises = [];
            for (const u of users) {
                const hasSelf = assignments.some(a => a.evaluatorId === u.uid && a.evaluateeId === u.uid && a.type === "Self");
                if (!hasSelf) {
                    promises.push(addDoc(collection(db, `periods/${id}/assignments`), {
                        periodId: id,
                        periodName: settingName,
                        evaluatorId: u.uid,
                        evaluatorName: u.displayName,
                        evaluateeId: u.uid,
                        evaluateeName: u.displayName,
                        type: "Self",
                        status: "pending",
                        createdAt: Timestamp.now()
                    }));
                    count++;
                }
            }
            if (promises.length > 0) {
                await Promise.all(promises);
                success(`Created ${count} self-evaluation assignments.`);
                fetchSubData();
            } else {
                success("Everyone already has a self-evaluation.");
            }
        } catch (err) {
            console.error(err);
            toastError("Failed to assign self-evaluations.");
        } finally {
            setIsGenerating(false);
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
            success("Period published successfully.");
        } catch (err) {
            console.error("Error publishing:", err);
            toastError("Failed to publish period.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnpublish = async () => {
        if (!confirm("Unpublishing will hide this period from employees and set it back to draft. Any existing evaluations will remain saved. Continue?")) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "periods", id as string), {
                status: 'draft',
                updatedAt: Timestamp.now()
            });
            setPeriod({ ...period, status: 'draft' });
            success("Period unpublished. It is now back in draft.");
        } catch (err) {
            console.error("Error unpublishing:", err);
            toastError("Failed to unpublish period.");
        } finally {
            setIsSaving(false);
        }
    };

    const onAddQuestion = async (text: string, type: "scale" | "paragraph", scope: "all" | "self") => {
        try {
            await addDoc(collection(db, `periods/${id}/questions`), {
                text,
                type,
                scope,
                order: questions.length,
                createdAt: Timestamp.now()
            });
            success("Question added.");
        } catch (err) {
            console.error("Error adding question:", err);
            toastError("Failed to add question.");
        }
    };

    const onUpdateQuestion = async (qId: string, text: string, type: "scale" | "paragraph", scope: "all" | "self") => {
        try {
            await updateDoc(doc(db, `periods/${id}/questions`, qId), {
                text,
                type,
                scope
            });
            success("Question updated.");
        } catch (err) {
            console.error("Error updating question:", err);
            toastError("Failed to update question.");
        }
    };

    const onDeleteQuestion = async (qId: string) => {
        if (!confirm("Delete this question?")) return;
        try {
            await deleteDoc(doc(db, `periods/${id}/questions`, qId));
            success("Question removed.");
        } catch (err) {
            console.error("Error deleting question:", err);
            toastError("Failed to remove question.");
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
        if (bulkReviewers.size === 0 || (bulkType !== "Self" && bulkReviewees.size === 0)) return;
        setIsGenerating(true);
        try {
            const batch = writeBatch(db);
            const reviewerIds = Array.from(bulkReviewers);
            const revieweeIds = Array.from(bulkReviewees);

            if (bulkType === "Self") {
                reviewerIds.forEach(targetId => {
                    const target = users.find(u => u.uid === targetId);
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
                });
            } else {
                reviewerIds.forEach(evalId => {
                    const evaluator = users.find(u => u.uid === evalId);
                    revieweeIds.forEach(targetId => {
                        const target = users.find(u => u.uid === targetId);
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
                });
            }

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
                    {period.status === 'draft' ? (
                        <button
                            onClick={handlePublish}
                            disabled={isSaving}
                            className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            Publish Period
                        </button>
                    ) : (
                        <button
                            onClick={handleUnpublish}
                            disabled={isSaving}
                            className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-700 disabled:opacity-50"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Unpublish Period
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
                        {questionsLoading ? (
                            <div className="space-y-4">
                                <SkeletonQuestionItem />
                                <SkeletonQuestionItem />
                                <SkeletonQuestionItem />
                            </div>
                        ) : (
                            <PeriodQuestions
                                questions={questions}
                                onAdd={onAddQuestion}
                                onUpdate={onUpdateQuestion}
                                onDelete={onDeleteQuestion}
                                onOpenLibrary={() => {
                                    fetchGlobalQuestions();
                                    setShowLibraryModal(true);
                                }}
                            />
                        )}
                    </motion.div>
                )}

                {activeTab === "assignments" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowBulkModal(true)}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                                >
                                    <Users className="h-4 w-4" />
                                    Assign Evaluations
                                </button>
                                <button
                                    onClick={handleAssignAllSelf}
                                    disabled={isGenerating}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                                >
                                    <UserCircle className="h-4 w-4" />
                                    Assign All Self
                                </button>
                                <button
                                    onClick={() => {
                                        const evaluators = Array.from(new Set(assignments.map(a => a.evaluatorId)));
                                        setExpandedEvaluators(new Set(evaluators));
                                    }}
                                    className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Expand All
                                </button>
                                <span className="text-zinc-200 dark:text-zinc-800">|</span>
                                <button
                                    onClick={() => setExpandedEvaluators(new Set())}
                                    className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Collapse All
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

                        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            {assignments.length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-zinc-500">No assignments created for this period.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {Object.entries(
                                        assignments.reduce((acc, a) => {
                                            if (!acc[a.evaluatorId]) acc[a.evaluatorId] = { name: a.evaluatorName, items: [] };
                                            acc[a.evaluatorId].items.push(a);
                                            return acc;
                                        }, {} as Record<string, { name: string, items: Assignment[] }>)
                                    ).map(([evalId, group]) => {
                                        const isExpanded = expandedEvaluators.has(evalId);
                                        const groupSelected = group.items.every(a => assignmentSelection.has(a.id));
                                        const someSelected = group.items.some(a => assignmentSelection.has(a.id));

                                        return (
                                            <div key={evalId} className="flex flex-col">
                                                <div
                                                    onClick={() => {
                                                        const next = new Set(expandedEvaluators);
                                                        if (isExpanded) next.delete(evalId); else next.add(evalId);
                                                        setExpandedEvaluators(next);
                                                    }}
                                                    className="group flex items-center justify-between bg-zinc-50/50 px-6 py-4 hover:bg-zinc-50 dark:bg-zinc-950/20 dark:hover:bg-zinc-950/40 cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const next = new Set(assignmentSelection);
                                                                if (groupSelected) {
                                                                    group.items.forEach(a => next.delete(a.id));
                                                                } else {
                                                                    group.items.forEach(a => next.add(a.id));
                                                                }
                                                                setAssignmentSelection(next);
                                                            }}
                                                            className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                                                        >
                                                            {groupSelected ? (
                                                                <CheckSquare className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
                                                            ) : someSelected ? (
                                                                <div className="h-5 w-5 rounded border-2 border-zinc-400 bg-zinc-400 flex items-center justify-center">
                                                                    <div className="h-0.5 w-3 bg-white" />
                                                                </div>
                                                            ) : (
                                                                <Square className="h-5 w-5" />
                                                            )}
                                                        </button>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar
                                                                src={users.find(u => u.uid === evalId)?.photoURL}
                                                                name={group.name}
                                                                size="sm"
                                                            />
                                                            <div>
                                                                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{group.name}</h4>
                                                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                                                    <span>{users.find(u => u.uid === evalId)?.role}</span>
                                                                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                                                    <span>{users.find(u => u.uid === evalId)?.department || "No Dept"}</span>
                                                                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                                                    <span className="text-zinc-500">{group.items.length} Reviewees</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {isExpanded ? <ChevronDown className="h-5 w-5 text-zinc-400" /> : <ChevronRight className="h-5 w-5 text-zinc-400" />}
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden bg-white dark:bg-zinc-900"
                                                        >
                                                            <table className="w-full text-left border-t border-zinc-100 dark:border-zinc-800">
                                                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                                    {group.items.map((a) => (
                                                                        <tr
                                                                            key={a.id}
                                                                            onClick={() => {
                                                                                const next = new Set(assignmentSelection);
                                                                                if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                                                                                setAssignmentSelection(next);
                                                                            }}
                                                                            className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${assignmentSelection.has(a.id) ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}`}
                                                                        >
                                                                            <td className="px-6 py-4 w-10">
                                                                                <div className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors pl-8">
                                                                                    {assignmentSelection.has(a.id) ? (
                                                                                        <CheckSquare className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
                                                                                    ) : (
                                                                                        <Square className="h-5 w-5" />
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Avatar
                                                                                        src={users.find(u => u.uid === a.evaluateeId)?.photoURL}
                                                                                        name={a.evaluateeName}
                                                                                        size="sm"
                                                                                    />
                                                                                    <div className="flex flex-col">
                                                                                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.evaluateeName}</div>
                                                                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                                                                            <span>{users.find(u => u.uid === a.evaluateeId)?.role}</span>
                                                                                            <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                                                                            <span>{users.find(u => u.uid === a.evaluateeId)?.department || "No Dept"}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
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
                                                                                    className="rounded-lg p-2 text-zinc-400 opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 cursor-point"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Global Library Modal */}
            {/* Questions Library Modal */}
            <Modal
                isOpen={showLibraryModal}
                onClose={() => setShowLibraryModal(false)}
                title="Questions Library"
                description="Select questions to add to this period"
                maxWidth="2xl"
                footer={(
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm font-medium text-zinc-500">
                            {selectedGlobalIds.size} questions selected
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedGlobalIds(new Set(globalQuestions.filter(q => !questions.some(pq => pq.text === q.text)).map(q => q.id)))}
                            >
                                Select All
                            </Button>
                            <Button
                                onClick={handleImportSelected}
                                disabled={importing || selectedGlobalIds.size === 0}
                                loading={importing}
                                icon={Plus}
                            >
                                Import Selected
                            </Button>
                        </div>
                    </div>
                )}
            >
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
            </Modal>

            {/* Bulk Assignment Wizard Modal */}
            <Modal
                isOpen={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                title="Bulk Assignment Wizard"
                description="Scale your review process in seconds"
                maxWidth="4xl"
                className="p-0"
                footer={(
                    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                        <div>
                            <p className="text-[10px] sm:text-xs font-medium text-zinc-500 italic uppercase tracking-wider">
                                Total assignments to be created: <span className="text-zinc-900 dark:text-zinc-50 font-bold text-sm sm:text-base">
                                    {bulkType === "Self" ? bulkReviewers.size : bulkReviewees.size * bulkReviewers.size}
                                </span>
                            </p>
                        </div>
                        <div className="flex w-full sm:w-auto gap-3">
                            <Button variant="ghost" onClick={() => setShowBulkModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBulkSubmit}
                                disabled={isGenerating || bulkReviewers.size === 0 || (bulkType !== "Self" && bulkReviewees.size === 0)}
                                loading={isGenerating}
                                icon={Plus}
                                className="px-8 shadow-xl"
                            >
                                Generate
                            </Button>
                        </div>
                    </div>
                )}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800 -m-8 h-[500px]">
                    {/* Left: Select Reviewers */}
                    <div className="p-8 space-y-6 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">1. Select Reviewer ({bulkReviewers.size})</h3>
                            <button
                                onClick={() => setBulkReviewers(new Set())}
                                className="text-[9px] sm:text-[10px] font-bold uppercase text-zinc-600 hover:underline"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    placeholder="Search people..."
                                    value={bulkSearch}
                                    onChange={e => setBulkSearch(e.target.value)}
                                    className="w-full rounded-xl bg-zinc-50 pl-10 py-2.5 text-xs border-none focus:ring-1 focus:ring-zinc-900 dark:bg-zinc-800 outline-none"
                                />
                            </div>
                            <select
                                value={bulkDept}
                                onChange={e => setBulkDept(e.target.value)}
                                className="rounded-xl bg-zinc-50 border-none text-xs px-3 dark:bg-zinc-800 outline-none"
                            >
                                <option>All</option>
                                {Array.from(new Set(users.map(u => u.department).filter(Boolean))).map(d => (
                                    <option key={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1 pr-2">
                            {users.filter(u =>
                                (bulkDept === "All" || u.department === bulkDept) &&
                                (u.displayName.toLowerCase().includes(bulkSearch.toLowerCase()))
                            ).filter(u => {
                                // If bulk type is Self, hide users who already have a self assignment
                                if (bulkType === "Self") {
                                    return !assignments.some(a => a.evaluatorId === u.uid && a.evaluateeId === u.uid && a.type === "Self");
                                }
                                return true;
                            }).map(u => {
                                const isSelected = bulkReviewers.has(u.uid);
                                return (
                                    <div
                                        key={u.uid}
                                        onClick={() => {
                                            const next = new Set<string>();
                                            if (!isSelected) next.add(u.uid);
                                            setBulkReviewers(next);
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-lg" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar src={u.photoURL} name={u.displayName} size="sm" />
                                            <div>
                                                <p className="text-[11px] font-bold">{u.displayName}</p>
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                                                    {u.role} • {u.department || "No Dept"}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircle2 className="h-4 w-4" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Setup Relationship & Reviewers */}
                    <div className="p-8 space-y-8 bg-zinc-50/50 dark:bg-zinc-950/20 overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">2. Define Relationship</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        setBulkRelId("self-default");
                                        setBulkType("Self");
                                        setBulkReviewees(new Set());
                                    }}
                                    className={`py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border transition-all ${bulkRelId === "self-default" ? "bg-zinc-900 text-white border-zinc-900 shadow-md dark:bg-zinc-100 dark:text-zinc-950" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:bg-zinc-900 dark:border-zinc-800"}`}
                                >
                                    Self Evaluation
                                </button>
                                <button
                                    disabled={(() => {
                                        if (bulkReviewers.size === 0) return false;
                                        const roles = Array.from(bulkReviewers).map(id => users.find(u => u.uid === id)?.role);
                                        return new Set(roles).size > 1;
                                    })()}
                                    onClick={() => {
                                        setBulkRelId("peer-default");
                                        setBulkType("Peer to Peer");
                                    }}
                                    className={`py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border transition-all ${bulkRelId === "peer-default" ? "bg-zinc-900 text-white border-zinc-900 shadow-md dark:bg-zinc-100 dark:text-zinc-950" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 disabled:opacity-50"}`}
                                >
                                    Peer to Peer
                                </button>
                                {roleRelationships.filter(rel => {
                                    if (bulkReviewers.size === 0) return true;

                                    const selectedReviewerRoles = Array.from(bulkReviewers)
                                        .map(id => users.find(u => u.uid === id)?.role)
                                        .filter(Boolean);

                                    // Find role object by ID (standard) or Name (fallback)
                                    const reviewerRoleObj = compRoles.find(r => r.id === rel.reviewerRoleId || r.name === rel.reviewerRoleId);
                                    if (!reviewerRoleObj) return false;

                                    return selectedReviewerRoles.every(r => r === reviewerRoleObj.name);
                                }).map(rel => (
                                    <button
                                        key={rel.id}
                                        onClick={() => {
                                            setBulkRelId(rel.id);
                                            setBulkType(rel.name);
                                            if (rel.revieweeRoleId === "self") {
                                                setBulkReviewees(new Set());
                                                setBulkType("Self");
                                            }
                                        }}
                                        className={`py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border transition-all ${bulkRelId === rel.id ? "bg-zinc-900 text-white border-zinc-900 shadow-md dark:bg-zinc-100 dark:text-zinc-950" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:bg-zinc-900 dark:border-zinc-800"}`}
                                    >
                                        {rel.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {bulkType !== "Self" && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">3. Select Reviewee(s) ({bulkReviewees.size})</h3>
                                    <button
                                        onClick={() => setBulkReviewees(new Set())}
                                        className="text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-600"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {users.filter(u => {
                                        if (!bulkRelId) return false;

                                        // Role Filtering Logic
                                        const targetRole = (() => {
                                            if (bulkRelId === "peer-default") {
                                                // Reviewee role must match the reviewer(s) role
                                                return users.find(rev => bulkReviewers.has(rev.uid))?.role;
                                            }
                                            if (bulkRelId === "self-default") return null;

                                            const rel = roleRelationships.find(r => r.id === bulkRelId);
                                            if (!rel || rel.revieweeRoleId === "self") return null;

                                            const roleObj = compRoles.find(r => r.id === rel.revieweeRoleId || r.name === rel.revieweeRoleId);
                                            return roleObj?.name;
                                        })();

                                        if (targetRole && u.role !== targetRole) return false;

                                        // Hide reviewees who are already being evaluated by ANY of the selected reviewers
                                        if (bulkReviewers.size > 0) {
                                            // 1. Check if they already have an assignment
                                            const alreadyAssigned = Array.from(bulkReviewers).some(revId =>
                                                assignments.some(a => a.evaluatorId === revId && a.evaluateeId === u.uid && a.type === bulkType)
                                            );
                                            if (alreadyAssigned) return false;

                                            // 2. Hide themselves if they are one of the selected reviewers
                                            if (bulkReviewers.has(u.uid)) return false;
                                        }
                                        return true;
                                    }).map(u => {
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
                                                    <Avatar src={u.photoURL} name={u.displayName} size="sm" />
                                                    <div>
                                                        <p className="text-[11px] font-bold">{u.displayName}</p>
                                                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                                                            {u.role} • {u.department || "No Dept"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && <CheckCircle2 className="h-4 w-4" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
