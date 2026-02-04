import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800",
                className
            )}
            {...props}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <Skeleton className="h-12 w-12 rounded-2xl mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
            </div>
        </div>
    );
}

export function SkeletonQuestionItem() {
    return (
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 max-w-sm">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
        </div>
    );
}
