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
import {
    Plus,
    Trash2,
    Edit2,
    Type,
    Hash,
    Check,
    AlertCircle,
    GripVertical,
    Layers,
    List,
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
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Question } from "@/components/ui/QuestionItem";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useQuestions } from "@/hooks/useQuestions";
import { SkeletonQuestionItem } from "@/components/ui/Skeleton";
import { X } from "lucide-react";
import { useCategories, Category } from "@/hooks/useCategories";
import { CategoryAccordion } from "@/components/questions/CategoryAccordion";
import { QuestionStats } from "@/components/questions/QuestionStats";
import { NativeSelect as Select } from "@/components/ui/native-select";

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
        <div ref={setNodeRef} style={style} className={`bg-card border border-border p-3 rounded-lg flex items-center justify-between group ${isDragging ? 'shadow-lg ring-1 ring-border z-500' : ''}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
                    <GripVertical className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex items-center gap-2">
                    <span className={`flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${q.type === 'scale' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                        {q.type === 'scale' ? <Hash className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                    </span>
                    <p className="text-xs font-medium truncate">{q.text}</p>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-muted-foreground hover:text-destructive p-1">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function QuestionsPage() {
    const { isAdmin } = useAuth();
    const { success, error: toastError } = useToast();
    const { questions, loading } = useQuestions();
    const { categories, loading: categoriesLoading } = useCategories();

    const [isAdding, setIsAdding] = useState(false);
    const [newText, setNewText] = useState("");
    const [newType, setNewType] = useState<"scale" | "paragraph">("scale");
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

    // Search
    const [searchQuery, setSearchQuery] = useState("");

    // Category accordion expand/collapse
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Category CRUD
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [categoryName, setCategoryName] = useState("");
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [reassignCategoryId, setReassignCategoryId] = useState("");

    // Category for new question (when adding via category menu)
    const [newQuestionCategoryId, setNewQuestionCategoryId] = useState("");

    // Bootstrap/migration state
    const [bootstrapping, setBootstrapping] = useState(false);

    const presetSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Filter questions by type + search
    const filteredQuestions = questions.filter(q => {
        const matchesType = typeFilter === "all" || q.type === typeFilter;
        const matchesSearch = !searchQuery.trim() || q.text.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    // Group by category
    const questionsByCategory = filteredQuestions.reduce((acc, q) => {
        const catId = q.categoryId || "uncategorized";
        if (!acc[catId]) acc[catId] = [];
        acc[catId].push(q);
        return acc;
    }, {} as Record<string, Question[]>);

    // Categories to display (hide empty during search)
    const visibleCategories = categories.filter(cat => {
        if (searchQuery.trim()) {
            return (questionsByCategory[cat.id]?.length || 0) > 0;
        }
        return true;
    });

    // Auto-expand categories with search matches
    useEffect(() => {
        if (searchQuery.trim()) {
            const catsWithMatches = new Set(
                filteredQuestions.map(q => q.categoryId).filter(Boolean)
            );
            setExpandedCategories(catsWithMatches as Set<string>);
        }
    }, [searchQuery, typeFilter]);

    // Bootstrap: create a default "General" category if none exist
    useEffect(() => {
        async function bootstrap() {
            if (!loading && !categoriesLoading && categories.length === 0 && questions.length > 0 && !bootstrapping) {
                setBootstrapping(true);
                try {
                    const catRef = await addDoc(collection(db, "question_categories"), {
                        name: "General",
                        createdAt: Timestamp.now(),
                    });
                    const batch = writeBatch(db);
                    questions.forEach(q => {
                        batch.update(doc(db, "questions", q.id), { categoryId: catRef.id });
                    });
                    await batch.commit();
                } catch (err) {
                    console.error("Bootstrap failed:", err);
                } finally {
                    setBootstrapping(false);
                }
            }
        }
        bootstrap();
    }, [loading, categoriesLoading, categories.length, questions]);

    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
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
                    categoryId: newQuestionCategoryId,
                });
                success("Question updated successfully.");
            } else {
                await addDoc(collection(db, "questions"), {
                    text: newText,
                    type: newType,
                    categoryId: newQuestionCategoryId,
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

    const startEditing = (question: Question) => {
        setNewText(question.text);
        setNewType(question.type);
        setNewQuestionCategoryId(question.categoryId || "");
        setEditingId(question.id);
        setIsAdding(true);
    };

    const resetForm = () => {
        setNewText("");
        setNewType("scale");
        setNewQuestionCategoryId("");
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

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) return;
        setSubmitting(true);
        try {
            if (editingCategory) {
                await updateDoc(doc(db, "question_categories", editingCategory.id), { name: categoryName });
                success("Category renamed.");
            } else {
                await addDoc(collection(db, "question_categories"), {
                    name: categoryName,
                    createdAt: Timestamp.now(),
                });
                success("Category created.");
            }
            setCategoryName("");
            setEditingCategory(null);
            setIsAddingCategory(false);
        } catch (err) {
            console.error(err);
            toastError("Failed to save category.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (!deletingCategory || !reassignCategoryId) return;
        setSubmitting(true);
        try {
            // Reassign all questions in this category
            const batch = writeBatch(db);
            questions
                .filter(q => q.categoryId === deletingCategory.id)
                .forEach(q => {
                    batch.update(doc(db, "questions", q.id), { categoryId: reassignCategoryId });
                });
            batch.delete(doc(db, "question_categories", deletingCategory.id));
            await batch.commit();
            success("Category deleted and questions reassigned.");
            setDeletingCategory(null);
            setReassignCategoryId("");
        } catch (err) {
            console.error(err);
            toastError("Failed to delete category.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (activeTab === "presets") {
            fetchPresets();
        }
    }, [activeTab]);

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

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-muted-foreground">Only administrators can manage evaluation questions.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "questions" | "presets")}>
                <PageHeader
                    title="Questions Library"
                    description="Manage questions and create re-usable presets for assignments."
                >
                    <TabsList>
                        <TabsTrigger value="questions">
                            <List className="h-4 w-4" />
                            Questions
                        </TabsTrigger>
                        <TabsTrigger value="presets">
                            <Layers className="h-4 w-4" />
                            Presets
                        </TabsTrigger>
                    </TabsList>
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

                <TabsContent value="questions">
                    <div className="space-y-6">
                        {/* Search bar */}
                        <Input
                            icon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search questions..."
                        />

                        {/* Filters + New Category */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 p-1 rounded-lg bg-muted overflow-x-auto">
                                {(['all', 'scale', 'paragraph'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setTypeFilter(filter)}
                                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${typeFilter === filter
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setCategoryName("");
                                    setEditingCategory(null);
                                    setIsAddingCategory(true);
                                }}
                                icon={Plus}
                            >
                                New Category
                            </Button>
                        </div>

                        {/* Stats */}
                        <QuestionStats questions={questions} categoryCount={categories.length} />

                        {/* Category Accordions */}
                        {(loading || categoriesLoading || bootstrapping) ? (
                            <Card className="overflow-hidden">
                                <div className="divide-y divide-border">
                                    <SkeletonQuestionItem />
                                    <SkeletonQuestionItem />
                                    <SkeletonQuestionItem />
                                    <SkeletonQuestionItem />
                                </div>
                            </Card>
                        ) : visibleCategories.length === 0 && categories.length === 0 ? (
                            <EmptyState
                                icon={Layers}
                                title="No categories yet"
                                description="Create a category to start organizing your questions."
                            />
                        ) : visibleCategories.length === 0 && searchQuery.trim() ? (
                            <EmptyState
                                icon={Search}
                                title="No results found"
                                description="No questions match your search."
                            />
                        ) : (
                            <div className="space-y-3">
                                {visibleCategories.map((cat) => (
                                    <CategoryAccordion
                                        key={cat.id}
                                        category={cat}
                                        questions={questionsByCategory[cat.id] || []}
                                        isExpanded={expandedCategories.has(cat.id)}
                                        onToggle={() => toggleCategory(cat.id)}
                                        searchQuery={searchQuery}
                                        onEditQuestion={startEditing}
                                        onDeleteQuestion={handleDelete}
                                        onEditCategory={() => {
                                            setCategoryName(cat.name);
                                            setEditingCategory(cat);
                                            setIsAddingCategory(true);
                                        }}
                                        onDeleteCategory={() => {
                                            setDeletingCategory(cat);
                                            setReassignCategoryId("");
                                        }}
                                        onAddQuestion={() => {
                                            resetForm();
                                            setNewQuestionCategoryId(cat.id);
                                            setIsAdding(true);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="presets">
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
                                        <p className="text-sm text-muted-foreground">{p.description || "No description."}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Questions Included</h4>
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
                                                <span className="text-xs text-muted-foreground italic">No questions selected.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button onClick={() => openEditPreset(p)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeletePreset(p.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

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
                        <Button onClick={handleFormSubmit} loading={submitting} disabled={!newText.trim() || !newQuestionCategoryId}>
                            {editingId ? "Update Question" : "Save Question"}
                        </Button>
                    </div>
                )}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <Input
                        autoFocus
                        label="Question Text"
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="e.g. How would you rate your communication this month?"
                    />

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Field Type</label>
                            <div className="flex gap-2 p-1 bg-muted rounded-lg">
                                {(["scale", "paragraph"] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setNewType(type)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${newType === type ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                                    >
                                        {type === "scale" ? <Hash className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                                        {type === "scale" ? "Scale" : "Text"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                            value={newQuestionCategoryId}
                            onChange={(e) => setNewQuestionCategoryId(e.target.value)}
                        >
                            <option value="">Select a category...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                    </div>
                </form>
            </Modal>

            {/* Add/Rename Category Modal */}
            <Modal
                isOpen={isAddingCategory}
                onClose={() => { setIsAddingCategory(false); setEditingCategory(null); setCategoryName(""); }}
                title={editingCategory ? "Rename Category" : "New Category"}
                description="Categories help organize your questions into groups."
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); setCategoryName(""); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCategory} loading={submitting} disabled={!categoryName.trim()}>
                            {editingCategory ? "Rename" : "Create Category"}
                        </Button>
                    </div>
                )}
            >
                <Input
                    autoFocus
                    label="Category Name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. Communication, Leadership, Technical"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveCategory(); }}
                />
            </Modal>

            {/* Delete Category Modal */}
            <Modal
                isOpen={!!deletingCategory}
                onClose={() => { setDeletingCategory(null); setReassignCategoryId(""); }}
                title="Delete Category"
                description={`${questions.filter(q => q.categoryId === deletingCategory?.id).length} questions will be reassigned to another category.`}
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => { setDeletingCategory(null); setReassignCategoryId(""); }}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteCategory}
                            loading={submitting}
                            disabled={!reassignCategoryId || categories.filter(c => c.id !== deletingCategory?.id).length === 0}
                        >
                            Delete & Reassign
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <div className="rounded-lg bg-destructive/10 p-4">
                        <p className="text-sm text-destructive">
                            This will permanently delete the category <strong>&quot;{deletingCategory?.name}&quot;</strong>. All questions in this category must be reassigned.
                        </p>
                    </div>
                    {categories.filter(c => c.id !== deletingCategory?.id).length > 0 ? (
                        <Select
                            label="Reassign questions to"
                            value={reassignCategoryId}
                            onChange={(e) => setReassignCategoryId(e.target.value)}
                        >
                            <option value="">Select a category...</option>
                            {categories.filter(c => c.id !== deletingCategory?.id).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                    ) : (
                        <p className="text-sm text-muted-foreground">You need at least one other category to reassign questions to.</p>
                    )}
                </div>
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
                        <p className="text-sm text-muted-foreground">{selectedQuestionIds.length} questions selected</p>
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


                    <div className="flex flex-col h-auto gap-6 md:grid md:grid-cols-2 md:h-[500px]">
                        {/* Left: Available Questions (Picker) */}
                        <div className="space-y-3 flex flex-col h-72 md:h-full">
                            <label className="text-sm font-medium">Available Questions</label>
                            <Input placeholder="Search questions..." className="mb-2" />
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar border border-border rounded-lg p-2">
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
                                            className={`p-3 rounded-lg border flex gap-3 cursor-pointer transition-all ${isSelected ? "bg-muted border-border" : "hover:border-border bg-card border-border"}`}
                                        >
                                            <div className={`h-4 w-4 rounded-md border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-foreground border-foreground text-background" : "border-border"}`}>
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                            <div>
                                                <div className="flex items-start gap-2">
                                                    <span className={`mt-0.5 flex items-center justify-center h-4 w-4 flex-shrink-0 rounded text-[10px] font-bold ${q.type === 'scale' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                                                        {q.type === 'scale' ? <Hash className="h-2.5 w-2.5" /> : <Type className="h-2.5 w-2.5" />}
                                                    </span>
                                                    <p className="text-xs font-medium line-clamp-2 text-left">{q.text}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Selected Questions (Sortable) */}
                        <div className="space-y-3 flex flex-col h-72 md:h-full">
                            <label className="text-sm font-medium">Selected Questions ({selectedQuestionIds.length})</label>
                            <p className="text-xs text-muted-foreground">Drag to reorder</p>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-border rounded-lg p-2 bg-muted/50">
                                {selectedQuestionIds.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
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
