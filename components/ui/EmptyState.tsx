import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    children,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 py-12 px-4 text-center dark:border-zinc-800",
            className
        )}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-300 dark:bg-zinc-800/50 mb-4">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{title}</h3>
            {description && (
                <p className="mt-1 text-sm text-zinc-500 max-w-sm">{description}</p>
            )}
            {children && (
                <div className="mt-6">
                    {children}
                </div>
            )}
        </div>
    );
}
