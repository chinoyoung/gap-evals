"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { QuestionItem, Question } from "@/components/ui/QuestionItem";
import { Category } from "@/hooks/useCategories";
import { CategoryMenu } from "./CategoryMenu";
import { highlightMatch } from "@/lib/highlight";

interface CategoryAccordionProps {
    category: Category;
    questions: Question[];
    isExpanded: boolean;
    onToggle: () => void;
    searchQuery: string;
    onEditQuestion: (q: Question) => void;
    onDeleteQuestion: (id: string) => void;
    onEditCategory: () => void;
    onDeleteCategory: () => void;
    onAddQuestion: () => void;
}

export function CategoryAccordion({
    category,
    questions,
    isExpanded,
    onToggle,
    searchQuery,
    onEditQuestion,
    onDeleteQuestion,
    onEditCategory,
    onDeleteCategory,
    onAddQuestion,
}: CategoryAccordionProps) {
    const scaleCount = questions.filter((q) => q.type === "scale").length;
    const textCount = questions.filter((q) => q.type === "paragraph").length;

    return (
        <Card className="overflow-hidden">
            {/* Header — use a div so we don't nest buttons inside a button */}
            <div className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                {/* Clickable toggle area */}
                <button
                    onClick={onToggle}
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                    aria-expanded={isExpanded}
                >
                    <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="shrink-0 text-zinc-400 dark:text-zinc-500"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </motion.div>

                    <span className="flex-1 font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">
                        {searchQuery ? highlightMatch(category.name, searchQuery) : category.name}
                    </span>
                </button>

                {/* Right-side controls — outside the toggle button */}
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="zinc">
                        {questions.length} {questions.length === 1 ? "question" : "questions"}
                    </Badge>

                    {(scaleCount > 0 || textCount > 0) && (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                            {[
                                scaleCount > 0 && `${scaleCount} scale`,
                                textCount > 0 && `${textCount} text`,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </span>
                    )}

                    <CategoryMenu
                        onAddQuestion={onAddQuestion}
                        onRename={onEditCategory}
                        onDelete={onDeleteCategory}
                    />
                </div>
            </div>

            {/* Body */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-zinc-100 dark:border-zinc-800">
                            {questions.length === 0 ? (
                                <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                                    No questions in this category
                                </p>
                            ) : (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {questions.map((question) => (
                                        <QuestionItem
                                            key={question.id}
                                            question={question}
                                            showGrip={false}
                                            onEdit={onEditQuestion}
                                            onDelete={onDeleteQuestion}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
