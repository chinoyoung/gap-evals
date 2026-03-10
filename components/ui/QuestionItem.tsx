import { Hash, Type, GripVertical, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ItemActions } from "@/components/ui/ItemActions";
import { cn } from "@/lib/utils";

export interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    scope?: "all" | "self";
    categoryId: string;
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
                "group flex items-center justify-between p-4 transition-colors hover:bg-muted/50",
                isDragging && "bg-card shadow-xl border-x border-border relative z-50",
                className
            )}
        >
            <div className="flex items-center gap-4">
                {showGrip && (
                    <div
                        {...dragHandleProps}
                        className={cn(
                            "text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing",
                            dragHandleProps ? "cursor-grab" : "cursor-default"
                        )}
                    >
                        <GripVertical className="h-5 w-5" />
                    </div>
                )}
                <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg whitespace-nowrap",
                    question.type === "scale" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
                )}>
                    {question.type === "scale" ? <Hash className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                </div>
                <div>
                    <h4 className="font-medium text-sm text-foreground line-clamp-2">{question.text}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{question.type}</span>
                        {question.scope === 'self' && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <Badge variant="amber" className="px-1.5 border-none">Self Only</Badge>
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
                        className="bg-transparent"
                        onClick={() => onDelete(question.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </ItemActions>
        </div>
    );
}
