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
                "rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 transition-all",
                hoverable && "hover:shadow-md hover:ring-zinc-300 dark:hover:ring-zinc-700 cursor-pointer",
                className
            )}
        >
            {children}
        </div>
    );
}
