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
    writeBatch
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    Edit2,
    Type,
    Hash,
    Loader2,
    AlertCircle,
    GripVertical,
    Filter
} from "lucide-react";

// Dnd Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    order: number;
    createdAt: any;
}

function SortableQuestionItem({
    q,
    onEdit,
    onDelete
}: {
    q: Question;
    onEdit: (q: Question) => void;
    onDelete: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: q.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        position: "relative" as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${isDragging ? "bg-white shadow-xl dark:bg-zinc-900 border-x border-zinc-200 dark:border-zinc-800" : ""
                }`}
        >
            <div className="flex items-center gap-4">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab text-zinc-300 hover:text-zinc-600 dark:text-zinc-700 dark:hover:text-zinc-400 active:cursor-grabbing"
                >
                    <GripVertical className="h-5 w-5" />
                </button>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${q.type === "scale" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    } dark:bg-zinc-800`}>
                    {q.type === "scale" ? <Hash className="h-5 w-5" /> : <Type className="h-5 w-5" />}
                </div>
                <div>
                    <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-50">{q.text}</h4>
                    <p className="text-xs text-zinc-600 uppercase tracking-wider mt-0.5">{q.type}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button
                    onClick={() => onEdit(q)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onDelete(q.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 cursor-pointer"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

export default function QuestionsPage() {
    const { role } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [newText, setNewText] = useState("");
    const [newType, setNewType] = useState<"scale" | "paragraph">("scale");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [typeFilter, setTypeFilter] = useState<"all" | "scale" | "paragraph">("all");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            // Fetch all questions. We sort in memory to support legacy questions without an 'order' field.
            const snapshot = await getDocs(collection(db, "questions"));
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Question));

            // Sort by order, then by createdAt if order is missing
            const sortedData = data.sort((a, b) => {
                const orderA = a.order !== undefined ? a.order : 999;
                const orderB = b.order !== undefined ? b.order : 999;
                if (orderA !== orderB) return orderA - orderB;

                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA; // Newer first if No order
            });

            setQuestions(sortedData);
        } catch (error) {
            console.error("Error fetching questions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newText.trim()) return;

        setSubmitting(true);
        try {
            if (editingId) {
                await updateDoc(doc(db, "questions", editingId), {
                    text: newText,
                    type: newType,
                });
            } else {
                await addDoc(collection(db, "questions"), {
                    text: newText,
                    type: newType,
                    order: questions.length,
                    createdAt: Timestamp.now(),
                });
            }
            resetForm();
            fetchQuestions();
        } catch (error) {
            console.error("Error saving question", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = questions.findIndex((q) => q.id === active.id);
            const newIndex = questions.findIndex((q) => q.id === over.id);

            const newOrder = arrayMove(questions, oldIndex, newIndex);
            setQuestions(newOrder);

            // Update orders in Firestore
            try {
                const batch = writeBatch(db);
                newOrder.forEach((q, index) => {
                    const qRef = doc(db, "questions", q.id);
                    batch.update(qRef, { order: index });
                });
                await batch.commit();
            } catch (error) {
                console.error("Error updating question order", error);
            }
        }
    };

    const startEditing = (question: Question) => {
        setNewText(question.text);
        setNewType(question.type);
        setEditingId(question.id);
        setIsAdding(true);
    };

    const resetForm = () => {
        setNewText("");
        setNewType("scale");
        setEditingId(null);
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
            await deleteDoc(doc(db, "questions", id));
            fetchQuestions();
        } catch (error) {
            console.error("Error deleting question", error);
        }
    };

    const filteredQuestions = questions.filter(q =>
        typeFilter === "all" ? true : q.type === typeFilter
    );

    if (role !== "Admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can manage evaluation questions.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Questions Library</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Manage template questions that can be imported into evaluation periods.</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                    <Plus className="h-4 w-4" />
                    Add Question
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    {editingId ? "Update Question" : "New Question"}
                                </label>
                                <input
                                    autoFocus
                                    value={newText}
                                    onChange={(e) => setNewText(e.target.value)}
                                    placeholder="e.g. How well does this team member communicate?"
                                    className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setNewType("scale")}
                                    className={`flex items-center justify-center gap-3 rounded-xl border p-4 transition-all cursor-pointer ${newType === "scale"
                                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                                        }`}
                                >
                                    <Hash className="h-4 w-4" />
                                    <span className="text-sm font-medium">1-10 Scale</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewType("paragraph")}
                                    className={`flex items-center justify-center gap-3 rounded-xl border p-4 transition-all cursor-pointer ${newType === "paragraph"
                                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                                        }`}
                                >
                                    <Type className="h-4 w-4" />
                                    <span className="text-sm font-medium">Paragraph</span>
                                </button>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !newText.trim()}
                                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-all disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingId ? "Update Question" : "Save Question"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-500">Filters:</span>
                    </div>
                    <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900">
                        {(['all', 'scale', 'paragraph'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTypeFilter(filter)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${typeFilter === filter
                                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="text-zinc-500 italic">No questions found matching this filter.</p>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis]}
                        >
                            <SortableContext
                                items={filteredQuestions.map((q) => q.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {filteredQuestions.map((q) => (
                                        <SortableQuestionItem
                                            key={q.id}
                                            q={q}
                                            onEdit={startEditing}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>
        </div>
    );
}
