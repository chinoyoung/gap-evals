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
    Filter,
    Layers,
    List,
    MoreHorizontal,
    CheckSquare,
    Square,
    ChevronLeft,
    ChevronRight,
    Search
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
import { X } from "lucide-react";

function SortablePresetItem({ q, onRemove }: { q: Question; onRemove: () => void }) {
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
        <div ref={setNodeRef} style={style} className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl flex items-center justify-between group ${isDragging ? 'shadow-lg ring-1 ring-zinc-900 z-500' : ''}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <button className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-600" {...attributes} {...listeners}>
                    <GripVertical className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{q.text}</p>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-zinc-400 hover:text-red-500 p-1">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
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
    const { isAdmin } = useAuth();
    const { success, error: toastError } = useToast();
    const { questions, loading, setQuestions } = useQuestions();

    const [isAdding, setIsAdding] = useState(false);
    const [newText, setNewText] = useState("");
    const [newType, setNewType] = useState<"scale" | "paragraph">("scale");
    const [newScope, setNewScope] = useState<"all" | "self">("all");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [typeFilter, setTypeFilter] = useState<"all" | "scale" | "paragraph">("all");

    // Presets State
    const [activeTab, setActiveTab] = useState<"questions" | "presets">("questions");
    const [presets, setPresets] = useState<any[]>([]);
    const [isAddingPreset, setIsAddingPreset] = useState(false);
    const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
    const [presetName, setPresetName] = useState("");
    const [presetDesc, setPresetDesc] = useState("");
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

    // Preset Drag State
    const [activePresetId, setActivePresetId] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const presetSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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

    useEffect(() => {
        if (activeTab === "presets") {
            fetchPresets();
        }
    }, [activeTab]);

    useEffect(() => {
        setCurrentPage(1);
    }, [typeFilter, questions.length]);

    const fetchPresets = async () => {
        try {
            const snap = await getDocs(query(collection(db, "question_presets"), orderBy("createdAt", "desc")));
            setPresets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        }
    };

    const handlePresetSubmit = async () => {
        if (!presetName.trim()) return;
        setSubmitting(true);
        try {
            const data = {
                name: presetName,
                description: presetDesc,
                questions: selectedQuestionIds,
                updatedAt: Timestamp.now()
            };

            if (editingPresetId) {
                await updateDoc(doc(db, "question_presets", editingPresetId), data);
                success("Preset updated.");
            } else {
                await addDoc(collection(db, "question_presets"), {
                    ...data,
                    createdAt: Timestamp.now()
                });
                success("Preset created.");
            }
            setIsAddingPreset(false);
            resetPresetForm();
            fetchPresets();
        } catch (err) {
            console.error(err);
            toastError("Failed to save preset.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePreset = async (id: string) => {
        if (!confirm("Delete this preset?")) return;
        try {
            await deleteDoc(doc(db, "question_presets", id));
            success("Preset deleted.");
            fetchPresets();
        } catch (err) {
            toastError("Failed to delete preset.");
        }
    };

    const resetPresetForm = () => {
        setPresetName("");
        setPresetDesc("");
        setSelectedQuestionIds([]);
        setEditingPresetId(null);
        setIsAddingPreset(false);
    };

    const openEditPreset = (p: any) => {
        setPresetName(p.name);
        setPresetDesc(p.description || "");
        setSelectedQuestionIds(p.questions || []);
        setEditingPresetId(p.id);
        setIsAddingPreset(true);
    };

    const handlePresetDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActivePresetId(null);

        if (over && active.id !== over.id) {
            const oldIndex = selectedQuestionIds.indexOf(active.id as string);
            const newIndex = selectedQuestionIds.indexOf(over.id as string);
            setSelectedQuestionIds(arrayMove(selectedQuestionIds, oldIndex, newIndex));
        }
    };

    const filteredQuestions = questions.filter(q =>
        typeFilter === "all" ? true : q.type === typeFilter
    );

    const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
    const paginatedQuestions = filteredQuestions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can manage evaluation questions.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Questions Library"
                description="Manage questions and create re-usable presets for assignments."
            >
                <div className="flex bg-zinc-100 p-1 rounded-xl dark:bg-zinc-800">
                    <button
                        onClick={() => setActiveTab("questions")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:cursor-pointer ${activeTab === "questions" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-500 dark:text-white" : "text-zinc-500 hover:text-zinc-500 dark:text-zinc-400"}`}
                    >
                        <List className="h-4 w-4" />
                        Questions
                    </button>
                    <button
                        onClick={() => setActiveTab("presets")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:cursor-pointer ${activeTab === "presets" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-500 dark:text-white" : "text-zinc-500 hover:text-zinc-500 dark:text-zinc-400"}`}
                    >
                        <Layers className="h-4 w-4" />
                        Presets
                    </button>
                </div>
                <Button onClick={() => {
                    if (activeTab === "questions") {
                        resetForm();
                        setIsAdding(true);
                    } else {
                        resetPresetForm();
                        setIsAddingPreset(true);
                    }
                }} icon={Plus}>
                    Add {activeTab === "questions" ? "Question" : "Preset"}
                </Button>
            </PageHeader>

            {activeTab === "questions" ? (
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
                                    items={paginatedQuestions.map((q) => q.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {paginatedQuestions.map((q) => (
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
                        {filteredQuestions.length > 0 && (
                            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                                <p className="text-xs text-zinc-500">
                                    Showing <span className="font-bold text-zinc-900 dark:text-zinc-100">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)}</span> of <span className="font-bold text-zinc-900 dark:text-zinc-100">{filteredQuestions.length}</span> questions
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-50 disabled:hover:border-zinc-200 disabled:hover:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-50 disabled:hover:border-zinc-200 disabled:hover:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {presets.length === 0 ? (
                        <div className="col-span-full">
                            <EmptyState
                                className="py-20"
                                icon={Layers}
                                title="No presets defined"
                                description="Create a preset to group questions for easy assignment."
                            />
                        </div>
                    ) : presets.map(p => (
                        <Card key={p.id} className="p-6 relative group">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg">{p.name}</h3>
                                    <p className="text-sm text-zinc-500">{p.description || "No description."}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Questions Included</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {p.questions?.slice(0, 3).map((qid: string) => {
                                            const q = questions.find(qu => qu.id === qid);
                                            return q ? (
                                                <Badge key={qid} variant="zinc">{q.text.substring(0, 20)}...</Badge>
                                            ) : null;
                                        })}
                                        {(p.questions?.length || 0) > 3 && (
                                            <Badge variant="zinc">+{p.questions.length - 3} more</Badge>
                                        )}
                                        {(!p.questions || p.questions.length === 0) && (
                                            <span className="text-xs text-zinc-400 italic">No questions selected.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => openEditPreset(p)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeletePreset(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:bg-red-900/20">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Questions Modal */}
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

            {/* Preset Modal */}
            <Modal
                isOpen={isAddingPreset}
                onClose={resetPresetForm}
                title={editingPresetId ? "Edit Preset" : "New Preset"}
                description="Group questions together for quick assignment."
                maxWidth="5xl"
                className="max-h-[90vh] flex flex-col"
                footer={(
                    <div className="flex justify-between w-full items-center">
                        <p className="text-sm text-zinc-500">{selectedQuestionIds.length} questions selected</p>
                        <div className="flex gap-3">
                            <Button variant="ghost" type="button" onClick={resetPresetForm}>
                                Cancel
                            </Button>
                            <Button onClick={handlePresetSubmit} loading={submitting} disabled={!presetName.trim() || selectedQuestionIds.length === 0}>
                                {editingPresetId ? "Update Preset" : "Save Preset"}
                            </Button>
                        </div>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Preset Name</label>
                            <Input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="e.g. Developer Review" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input value={presetDesc} onChange={e => setPresetDesc(e.target.value)} placeholder="Optional description..." />
                        </div>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
                        {/* Left: Available Questions (Picker) */}
                        <div className="space-y-3 flex flex-col h-full">
                            <label className="text-sm font-medium">Available Questions</label>
                            <Input placeholder="Search questions..." className="mb-2" />
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar border rounded-xl p-2">
                                {questions.map(q => {
                                    const isSelected = selectedQuestionIds.includes(q.id);
                                    return (
                                        <div
                                            key={q.id}
                                            onClick={() => {
                                                let next = [...selectedQuestionIds];
                                                if (isSelected) {
                                                    next = next.filter(id => id !== q.id);
                                                } else {
                                                    next.push(q.id);
                                                }
                                                setSelectedQuestionIds(next);
                                            }}
                                            className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition-all ${isSelected ? "bg-zinc-50 border-zinc-300 dark:bg-zinc-800/50 dark:border-zinc-700" : "hover:border-zinc-400 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"}`}
                                        >
                                            <div className={`h-4 w-4 rounded-md border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900" : "border-zinc-300 dark:border-zinc-600"}`}>
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium line-clamp-2 text-left">{q.text}</p>
                                                <div className="flex gap-1 mt-1">
                                                    <Badge variant="zinc" className="text-[9px] py-0 px-1">{q.type}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Selected Questions (Sortable) */}
                        <div className="space-y-3 flex flex-col h-full">
                            <label className="text-sm font-medium">Selected Questions ({selectedQuestionIds.length})</label>
                            <p className="text-xs text-zinc-400">Drag to reorder</p>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border rounded-xl p-2 bg-zinc-50/50 dark:bg-zinc-900/50">
                                {selectedQuestionIds.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">
                                        No questions selected.
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={presetSensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handlePresetDragEnd}
                                        modifiers={[restrictToVerticalAxis]}
                                    >
                                        <SortableContext
                                            items={selectedQuestionIds}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-2">
                                                {selectedQuestionIds.map((id) => {
                                                    const q = questions.find(q => q.id === id);
                                                    if (!q) return null;
                                                    return (
                                                        <SortablePresetItem
                                                            key={id}
                                                            q={q}
                                                            onRemove={() => setSelectedQuestionIds(prev => prev.filter(pid => pid !== id))}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
