"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    Timestamp
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    User,
    ArrowRight,
    Loader2,
    Users,
    AlertCircle
} from "lucide-react";

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    role: string;
}

interface Assignment {
    id: string;
    evaluatorId: string;
    evaluatorName: string;
    evaluateeId: string;
    evaluateeName: string;
    type: "peer" | "manager-to-employee" | "employee-to-manager" | "self";
    status: "pending" | "completed";
    createdAt: any;
}

export default function AssignmentsPage() {
    const { role } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);

    const [evaluator, setEvaluator] = useState("");
    const [evaluatee, setEvaluatee] = useState("");
    const [type, setType] = useState<Assignment["type"]>("peer");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersSnap, assignmentsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(query(collection(db, "assignments"), orderBy("createdAt", "desc")))
            ]);

            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
            setAssignments(assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!evaluator || !evaluatee) return;

        setSubmitting(true);
        const evalUser = users.find(u => u.id === evaluator);
        const targetUser = users.find(u => u.id === evaluatee);

        try {
            await addDoc(collection(db, "assignments"), {
                evaluatorId: evaluator,
                evaluatorName: evalUser?.displayName || evalUser?.email,
                evaluateeId: evaluatee,
                evaluateeName: targetUser?.displayName || targetUser?.email,
                type,
                status: "pending",
                createdAt: Timestamp.now(),
            });
            setIsAdding(false);
            setEvaluator("");
            setEvaluatee("");
            fetchData();
        } catch (error) {
            console.error("Error adding assignment", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this assignment?")) return;
        try {
            await deleteDoc(doc(db, "assignments", id));
            fetchData();
        } catch (error) {
            console.error("Error deleting assignment", error);
        }
    };

    if (role !== "Admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can manage assignments.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Evaluation Assignments</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Assign evaluators to team members.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                    <Plus className="h-4 w-4" />
                    New Assignment
                </button>
            </header>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                    >
                        <form onSubmit={handleAddAssignment} className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Evaluator</label>
                                    <select
                                        value={evaluator}
                                        onChange={(e) => setEvaluator(e.target.value)}
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                                    >
                                        <option value="">Select Evaluator</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Evaluatee</label>
                                    <select
                                        value={evaluatee}
                                        onChange={(e) => setEvaluatee(e.target.value)}
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                                    >
                                        <option value="">Select Team Member</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Relationship Type</label>
                                <div className="flex flex-wrap gap-3">
                                    {["peer", "manager-to-employee", "employee-to-manager", "self"].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t as any)}
                                            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${type === t
                                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                                                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                                                }`}
                                        >
                                            {t.replace(/-/g, " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !evaluator || !evaluatee}
                                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-all disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Assign
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-zinc-500 italic">No assignments created yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800/50 dark:border-zinc-800">
                                    <th className="px-6 py-4">Evaluator</th>
                                    <th className="px-6 py-4 text-center"></th>
                                    <th className="px-6 py-4">Evaluatee</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {assignments.map((a) => (
                                    <tr key={a.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.evaluatorName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <ArrowRight className="inline h-4 w-4 text-zinc-300" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.evaluateeName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                {a.type.replace(/-/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(a.id)}
                                                className="rounded-lg p-2 text-zinc-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
