import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    children,
    className
}: PageHeaderProps) {
    return (
        <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8", className)}>
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-50">{title}</h1>
                {description && (
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </header>
    );
}
