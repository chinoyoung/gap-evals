import { Hash, Type, GripVertical, Edit2, Trash2 } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { ItemActions } from "./ItemActions";
import { cn } from "@/lib/utils";

export interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    scope?: "all" | "self";
    order?: number;
    [key: string]: any;
}

interface QuestionItemProps {
    question: Question;
    onEdit?: (q: Question) => void;
    onDelete?: (id: string) => void;
    showGrip?: boolean;
    dragHandleProps?: any;
    isDragging?: boolean;
    className?: string;
}

export function QuestionItem({
    question,
    onEdit,
    onDelete,
    showGrip = false,
    dragHandleProps,
    isDragging = false,
    className
}: QuestionItemProps) {
    return (
        <div
            className={cn(
                "group flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                isDragging && "bg-white shadow-xl dark:bg-zinc-900 border-x border-zinc-200 dark:border-zinc-800 relative z-50",
                className
            )}
        >
            <div className="flex items-center gap-4">
                {showGrip && (
                    <div
                        {...dragHandleProps}
                        className={cn(
                            "text-zinc-300 hover:text-zinc-600 dark:text-zinc-700 dark:hover:text-zinc-400 active:cursor-grabbing",
                            dragHandleProps ? "cursor-grab" : "cursor-default"
                        )}
                    >
                        <GripVertical className="h-5 w-5" />
                    </div>
                )}
                <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl whitespace-nowrap",
                    question.type === "scale" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600",
                    "dark:bg-zinc-800"
                )}>
                    {question.type === "scale" ? <Hash className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                </div>
                <div>
                    <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-50 line-clamp-2">{question.text}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{question.type}</span>
                        {question.scope === 'self' && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                <Badge variant="amber" className="px-1.5 border-none bg-amber-500/10">Self Only</Badge>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ItemActions>
                {onEdit && (
                    <Button variant="ghost" size="icon" onClick={() => onEdit(question)}>
                        <Edit2 className="h-4 w-4" />
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="danger"
                        size="icon"
                        className="bg-transparent hover:bg-red-50"
                        onClick={() => onDelete(question.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </ItemActions>
        </div>
    );
}
