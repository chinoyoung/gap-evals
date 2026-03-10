"use client";

import { useState, useRef, useEffect, useId } from "react";
import { MoreHorizontal, Plus, Edit2, Trash2 } from "lucide-react";

interface CategoryMenuProps {
    onAddQuestion: () => void;
    onRename: () => void;
    onDelete: () => void;
}

export function CategoryMenu({ onAddQuestion, onRename, onDelete }: CategoryMenuProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return;

        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    function handleItem(action: () => void) {
        setOpen(false);
        action();
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                aria-expanded={open}
                aria-controls={menuId}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Category options"
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full z-50 mt-1 w-44 bg-white dark:bg-zinc-800 rounded-xl shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-700 py-1"
                >
                    <button
                        role="menuitem"
                        onClick={() => handleItem(onAddQuestion)}
                        className="w-full px-3 py-2 text-sm flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
                    >
                        <Plus className="h-4 w-4 text-zinc-400" />
                        Add Question
                    </button>
                    <button
                        role="menuitem"
                        onClick={() => handleItem(onRename)}
                        className="w-full px-3 py-2 text-sm flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
                    >
                        <Edit2 className="h-4 w-4 text-zinc-400" />
                        Rename
                    </button>
                    <button
                        role="menuitem"
                        onClick={() => handleItem(onDelete)}
                        className="w-full px-3 py-2 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Category
                    </button>
                </div>
            )}
        </div>
    );
}
