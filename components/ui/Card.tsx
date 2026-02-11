import { cn } from "@/lib/utils";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverable?: boolean;
    onClick?: () => void;
}

export function Card({
    children,
    className,
    hoverable = false,
    onClick
}: CardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-3xl bg-white shadow-sm shadow-zinc-900/[0.03] ring-1 ring-zinc-200/80 dark:bg-zinc-900/80 dark:ring-zinc-800/60 transition-all duration-200",
                hoverable && "hover:shadow-md hover:shadow-zinc-900/[0.06] hover:ring-zinc-300/80 dark:hover:shadow-black/30 dark:hover:ring-zinc-700/80 cursor-pointer",
                className
            )}
        >
            {children}
        </div>
    );
}
