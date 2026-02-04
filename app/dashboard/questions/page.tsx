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
    Check,
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

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ItemActions } from "@/components/ui/ItemActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";

import { QuestionItem, Question } from "@/components/ui/QuestionItem";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useQuestions } from "@/hooks/useQuestions";
import { SkeletonQuestionItem } from "@/components/ui/Skeleton";

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
        <div ref={setNodeRef} style={style}>
            <QuestionItem
                question={q}
                onEdit={onEdit}
                onDelete={onDelete}
                showGrip
                dragHandleProps={{ ...attributes, ...listeners }}
                isDragging={isDragging}
            />
        </div>
    );
}

export default function QuestionsPage() {
    const { role } = useAuth();
    const { success, error: toastError } = useToast();
    const { questions, loading, setQuestions } = useQuestions();

    const [isAdding, setIsAdding] = useState(false);
    const [newText, setNewText] = useState("");
    const [newType, setNewType] = useState<"scale" | "paragraph">("scale");
    const [newScope, setNewScope] = useState<"all" | "self">("all");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [typeFilter, setTypeFilter] = useState<"all" | "scale" | "paragraph">("all");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newText.trim()) return;

        setSubmitting(true);
        try {
            if (editingId) {
                await updateDoc(doc(db, "questions", editingId), {
                    text: newText,
                    type: newType,
                    scope: newScope,
                });
                success("Question updated successfully.");
            } else {
                await addDoc(collection(db, "questions"), {
                    text: newText,
                    type: newType,
                    scope: newScope,
                    order: questions.length,
                    createdAt: Timestamp.now(),
                });
                success("Question created successfully.");
            }
            resetForm();
        } catch (error) {
            console.error("Error saving question", error);
            toastError("Failed to save question.");
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

            try {
                const batch = writeBatch(db);
                newOrder.forEach((q, index) => {
                    const qRef = doc(db, "questions", q.id);
                    batch.update(qRef, { order: index });
                });
                await batch.commit();
            } catch (error) {
                console.error("Error updating question order", error);
                toastError("Failed to save new order.");
            }
        }
    };

    const startEditing = (question: Question) => {
        setNewText(question.text);
        setNewType(question.type);
        setNewScope(question.scope || "all");
        setEditingId(question.id);
        setIsAdding(true);
    };

    const resetForm = () => {
        setNewText("");
        setNewType("scale");
        setNewScope("all");
        setEditingId(null);
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
            await deleteDoc(doc(db, "questions", id));
            success("Question deleted.");
        } catch (error) {
            console.error("Error deleting question", error);
            toastError("Failed to delete question.");
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
            <PageHeader
                title="Questions Library"
                description="Manage template questions that can be imported into evaluation periods."
            >
                <Button onClick={() => { resetForm(); setIsAdding(true); }} icon={Plus}>
                    Add Question
                </Button>
            </PageHeader>

            <Modal
                isOpen={isAdding}
                onClose={resetForm}
                title={editingId ? "Edit Question" : "New Question"}
                description="Global questions can be imported into any evaluation period."
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" type="button" onClick={resetForm}>
                            Cancel
                        </Button>
                        <Button onClick={handleFormSubmit} loading={submitting} disabled={!newText.trim()}>
                            {editingId ? "Update Question" : "Save Question"}
                        </Button>
                    </div>
                )}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Question Text</label>
                        <input
                            autoFocus
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="e.g. How would you rate your communication this month?"
                            className="w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-zinc-100"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Field Type</label>
                            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                                {(["scale", "paragraph"] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setNewType(type)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${newType === type ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500"}`}
                                    >
                                        {type === "scale" ? <Hash className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                                        {type === "scale" ? "Scale" : "Text"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-6">
                            <div
                                onClick={() => setNewScope(newScope === "self" ? "all" : "self")}
                                className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${newScope === "self"
                                    ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950"
                                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
                                    }`}
                            >
                                {newScope === "self" && <Check className="h-4 w-4" strokeWidth={3} />}
                            </div>
                            <div className="cursor-pointer select-none" onClick={() => setNewScope(newScope === "self" ? "all" : "self")}>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">Self-Evaluation Only</p>
                                <p className="text-[11px] text-zinc-500">Only visible for self-reflections.</p>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

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
                                    : "text-zinc-500 hover:text-zinc-200 dark:text-zinc-400"
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <Card className="overflow-hidden">
                    {loading ? (
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            <SkeletonQuestionItem />
                            <SkeletonQuestionItem />
                            <SkeletonQuestionItem />
                            <SkeletonQuestionItem />
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <EmptyState
                            className="border-none py-20"
                            icon={Filter}
                            title="No questions found"
                            description="No questions found matching this filter."
                        />
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
                </Card>
            </div>
        </div>
    );
}
