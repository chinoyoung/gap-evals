import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BadgeProps {
    children: React.ReactNode;
    icon?: LucideIcon;
    variant?: "default" | "amber" | "blue" | "emerald" | "red" | "zinc" | "indigo";
    className?: string;
}

export function Badge({
    children,
    icon: Icon,
    variant = "default",
    className
}: BadgeProps) {
    const variants = {
        default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
        amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500",
        blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-500",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-500",
        zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
        indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
    };

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            variants[variant],
            className
        )}>
            {Icon && <Icon className="h-3 w-3" />}
            {children}
        </div>
    );
}
