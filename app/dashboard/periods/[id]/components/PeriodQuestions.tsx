"use client";

import { useState } from "react";
import { Plus, RotateCcw, Hash, Type, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuestionItem, Question } from "@/components/ui/QuestionItem";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface PeriodQuestionsProps {
    questions: Question[];
    onAdd: (text: string, type: "scale" | "paragraph", scope: "all" | "self") => Promise<void>;
    onUpdate: (id: string, text: string, type: "scale" | "paragraph", scope: "all" | "self") => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onOpenLibrary: () => void;
}

export function PeriodQuestions({
    questions,
    onAdd,
    onUpdate,
    onDelete,
    onOpenLibrary
}: PeriodQuestionsProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [text, setText] = useState("");
    const [type, setType] = useState<"scale" | "paragraph">("scale");
    const [scope, setScope] = useState<"all" | "self">("all");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSubmitting(true);
        try {
            if (editingId) {
                await onUpdate(editingId, text, type, scope);
            } else {
                await onAdd(text, type, scope);
            }
            reset();
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setText("");
        setType("scale");
        setScope("all");
        setEditingId(null);
        setIsAdding(false);
    };

    const startEdit = (q: Question) => {
        setText(q.text || "");
        setType(q.type || "scale");
        setScope(q.scope || "all");
        setEditingId(q.id);
        setIsAdding(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button onClick={() => setIsAdding(true)} icon={Plus}>
                        Add Question
                    </Button>
                    <Button variant="ghost" onClick={onOpenLibrary} icon={RotateCcw}>
                        Select from Library
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <Input
                                    label={editingId ? "Update Question" : "New Question"}
                                    autoFocus
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Question text..."
                                />
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Field Type</label>
                                        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                                            {(["scale", "paragraph"] as const).map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setType(t)}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${type === t ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500"}`}
                                                >
                                                    {t === "scale" ? <Hash className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                                                    {t === "scale" ? "Scale" : "Text"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-6">
                                        <div
                                            onClick={() => setScope(scope === "self" ? "all" : "self")}
                                            className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${scope === "self"
                                                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950"
                                                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
                                                }`}
                                        >
                                            {scope === "self" && <Check className="h-4 w-4" strokeWidth={3} />}
                                        </div>
                                        <div className="cursor-pointer select-none" onClick={() => setScope(scope === "self" ? "all" : "self")}>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">Self-Evaluation Only</p>
                                            <p className="text-[11px] text-zinc-500">Only visible for self-reflections.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <Button variant="ghost" onClick={reset}>Cancel</Button>
                                    <Button type="submit" loading={submitting}>{editingId ? "Update" : "Save"} Question</Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                {questions.length === 0 ? (
                    <div className="py-20 text-center text-zinc-500">
                        No questions defined for this period.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {questions.map((q) => (
                            <QuestionItem
                                key={q.id}
                                question={q}
                                showGrip
                                onEdit={startEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
