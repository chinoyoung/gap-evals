import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    icon?: LucideIcon;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    className,
    label,
    error,
    id,
    icon: Icon,
    children,
    ...props
}, ref) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label
                    htmlFor={id}
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                )}
                <select
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full appearance-none rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100",
                        Icon && "pl-11",
                        error && "border-red-500 focus:border-red-500 dark:border-red-500",
                        className
                    )}
                    {...props}
                >
                    {/* Add wrapper to children to style options if they are passed as raw tags */}
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-zinc-400"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </div>
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
});

Select.displayName = "Select";

export { Select };
