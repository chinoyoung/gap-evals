"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    addDoc,
    Timestamp,
    deleteDoc,
    doc
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    CalendarDays,
    ChevronRight,
    MoreVertical,
    Trash2,
    Calendar,
    Clock,
    FileEdit,
    CheckCircle2,
    AlertCircle,
    Archive,
    RotateCcw,
    Loader2
} from "lucide-react";
import Link from "next/link";

interface Period {
    id: string;
    name: string;
    description: string;
    status: 'draft' | 'published';
    startDate: string;
    endDate: string;
    archived?: boolean;
    createdAt: any;
}

export default function PeriodsPage() {
    const { role } = useAuth();
    const [periods, setPeriods] = useState<Period[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);

    // Form state
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newStart, setNewStart] = useState("");
    const [newEnd, setNewEnd] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchPeriods();
    }, []);

    const fetchPeriods = async () => {
        try {
            const q = query(collection(db, "periods"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Period));
            setPeriods(data);
        } catch (error) {
            console.error("Error fetching periods:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || isCreating) return;

        setIsCreating(true);
        try {
            const docRef = await addDoc(collection(db, "periods"), {
                name: newName,
                description: newDesc,
                startDate: newStart,
                endDate: newEnd,
                status: 'draft',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setShowNewModal(false);
            resetForm();
            fetchPeriods();
        } catch (error) {
            console.error("Error creating period:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleArchive = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const { updateDoc, doc } = await import("firebase/firestore");
            await updateDoc(doc(db, "periods", id), {
                archived: !currentStatus,
                updatedAt: Timestamp.now()
            });
            fetchPeriods();
        } catch (error) {
            console.error("Error toggling archive status:", error);
        }
    };

    const resetForm = () => {
        setNewName("");
        setNewDesc("");
        setNewStart("");
        setNewEnd("");
    };

    if (role !== "Admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can manage evaluation periods.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Evaluation Periods</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Manage review cycles, questions, and assignments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        <Plus className="h-4 w-4" />
                        New Period
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                </div>
            ) : periods.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 py-20 text-center dark:border-zinc-800">
                    <CalendarDays className="mb-4 h-12 w-12 text-zinc-300" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">No evaluation periods</h3>
                    <p className="mt-1 text-zinc-500">Create your first evaluation period to get started.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Active Periods */}
                    <div className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            {periods.filter(p => !p.archived).map((period) => (
                                <Link
                                    key={period.id}
                                    href={`/dashboard/periods/${period.id}`}
                                    className="group relative flex flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-zinc-700 pointer-events-auto cursor-pointer"
                                >
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${period.status === 'published'
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}>
                                            {period.status === 'published' ? <CheckCircle2 className="h-3 w-3" /> : <FileEdit className="h-3 w-3" />}
                                            {period.status}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => handleToggleArchive(period.id, false, e)}
                                                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800 cursor-pointer"
                                                title="Archive Period"
                                            >
                                                <Archive className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (confirm("Delete this period?")) {
                                                        deleteDoc(doc(db, "periods", period.id)).then(() => fetchPeriods());
                                                    }
                                                }}
                                                className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                                        {period.name}
                                    </h3>
                                    <p className="mt-2 text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                                        {period.description || "No description provided."}
                                    </p>

                                    <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{period.startDate ? new Date(period.startDate).toLocaleDateString() : 'Set start date'}</span>
                                            <span>→</span>
                                            <span>{period.endDate ? new Date(period.endDate).toLocaleDateString() : 'Set end date'}</span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-6 right-6 translate-x-4 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Archived Periods */}
                    {periods.some(p => p.archived) && (
                        <div className="space-y-6 pt-12 border-t border-zinc-100 dark:border-zinc-800">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Archived Cycles</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {periods.filter(p => p.archived).map((period) => (
                                    <div
                                        key={period.id}
                                        className="group relative flex flex-col rounded-[2rem] bg-zinc-50/50 p-6 ring-1 ring-zinc-200/50 transition-all hover:bg-zinc-50 dark:bg-zinc-900/30 dark:ring-zinc-800/50"
                                    >
                                        <div className="mb-4 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Archived</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={(e) => handleToggleArchive(period.id, true, e)}
                                                    className="rounded-lg p-2 text-zinc-400 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                                                    title="Restore Period"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (confirm("Permanently delete this archived period?")) {
                                                            deleteDoc(doc(db, "periods", period.id)).then(() => fetchPeriods());
                                                        }
                                                    }}
                                                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="text-base font-bold text-zinc-500 dark:text-zinc-400">{period.name}</h4>
                                        <p className="mt-2 text-xs text-zinc-400 line-clamp-1">{period.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* New Period Modal */}
            <AnimatePresence>
                {showNewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl dark:bg-zinc-900"
                        >
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Create Evaluation Period</h2>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Period Name</label>
                                    <input
                                        required
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Q1 2024 Performance Review"
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date</label>
                                        <input
                                            type="date"
                                            value={newStart}
                                            onChange={(e) => setNewStart(e.target.value)}
                                            className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date</label>
                                        <input
                                            type="date"
                                            value={newEnd}
                                            onChange={(e) => setNewEnd(e.target.value)}
                                            className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
                                    <textarea
                                        rows={3}
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="Brief summary of this evaluation cycle..."
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewModal(false)}
                                        className="rounded-xl px-6 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex items-center gap-2 rounded-xl bg-zinc-900 px-8 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer"
                                    >
                                        {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Create Period
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
