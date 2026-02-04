import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: LucideIcon;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    className,
    label,
    error,
    id,
    icon: Icon,
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
                    <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 py-3 text-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-100 dark:focus:ring-zinc-100",
                        Icon && "pl-11",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
});

Input.displayName = "Input";

export { Input };
