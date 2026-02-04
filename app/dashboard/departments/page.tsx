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

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ItemActions } from "@/components/ui/ItemActions";
import { EmptyState } from "@/components/ui/EmptyState";

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
            <PageHeader
                title="Departments"
                description="Organize your team members into functional groups."
            >
                <Button
                    onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }}
                    icon={Plus}
                >
                    New Department
                </Button>
            </PageHeader>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="p-8">
                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <Input
                                        label="Department Name"
                                        autoFocus
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Engineering, Marketing, HR"
                                    />
                                    <Input
                                        label="Description (Optional)"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of the department"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <Button variant="ghost" type="button" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={submitting}
                                        disabled={!name.trim()}
                                    >
                                        {editingId ? "Update Department" : "Create Department"}
                                    </Button>
                                </div>
                            </form>
                        </Card>
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
                        className="w-full rounded-xl border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-40 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
                        ))
                    ) : filteredDepartments.length === 0 ? (
                        <EmptyState
                            className="col-span-full py-20"
                            icon={Building2}
                            title="No departments found"
                            description="Organize your team members into functional groups."
                        />
                    ) : (
                        filteredDepartments.map((dept) => (
                            <motion.div layout key={dept.id} className="group">
                                <Card className="p-6 relative isolate">
                                    <div className="flex items-start justify-between">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 dark:bg-white dark:text-zinc-950">
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <ItemActions>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => startEditing(dept)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="icon"
                                                className="bg-transparent hover:bg-red-50"
                                                onClick={() => handleDelete(dept.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </ItemActions>
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
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
