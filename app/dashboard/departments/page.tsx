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
    updateDoc,
    doc,
    Timestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    Edit2,
    Building2,
    Loader2,
    AlertCircle,
    ChevronRight,
    Search
} from "lucide-react";
import Link from "next/link";

interface Department {
    id: string;
    name: string;
    description: string;
    createdAt: any;
}

export default function DepartmentsPage() {
    const { role } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const q = query(collection(db, "departments"), orderBy("name", "asc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Department));
            setDepartments(data);
        } catch (error) {
            console.error("Error fetching departments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSubmitting(true);
        try {
            if (editingId) {
                await updateDoc(doc(db, "departments", editingId), {
                    name,
                    description,
                });
            } else {
                await addDoc(collection(db, "departments"), {
                    name,
                    description,
                    createdAt: Timestamp.now(),
                });
            }
            resetForm();
            fetchDepartments();
        } catch (error) {
            console.error("Error saving department", error);
        } finally {
            setSubmitting(false);
        }
    };

    const startEditing = (dept: Department) => {
        setName(dept.name);
        setDescription(dept.description);
        setEditingId(dept.id);
        setIsAdding(true);
    };

    const resetForm = () => {
        setName("");
        setDescription("");
        setEditingId(null);
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will not remove users from this department but will remove the department reference.")) return;
        try {
            await deleteDoc(doc(db, "departments", id));
            fetchDepartments();
        } catch (error) {
            console.error("Error deleting department", error);
        }
    };

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (role !== "Admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can manage departments.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Departments</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Organize your team members into functional groups.</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                    <Plus className="h-4 w-4" />
                    New Department
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
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Department Name</label>
                                    <input
                                        autoFocus
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Engineering, Marketing, HR"
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
                                    <input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of the department"
                                        className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !name.trim()}
                                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-all disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingId ? "Update Department" : "Create Department"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-40 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
                        ))
                    ) : filteredDepartments.length === 0 ? (
                        <div className="col-span-full py-12 text-center rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">
                            <Building2 className="mx-auto h-12 w-12 text-zinc-200" />
                            <p className="mt-4 text-zinc-500 italic">No departments found.</p>
                        </div>
                    ) : (
                        filteredDepartments.map((dept) => (
                            <motion.div
                                layout
                                key={dept.id}
                                className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 dark:bg-white dark:text-zinc-950">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => startEditing(dept)}
                                            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(dept.id)}
                                            className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{dept.name}</h3>
                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                        {dept.description || "No description provided."}
                                    </p>
                                </div>
                                <Link
                                    href={`/dashboard/team?dept=${dept.id}`}
                                    className="mt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                                >
                                    <span>Manage Members</span>
                                    <ChevronRight className="h-3 w-3" />
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
