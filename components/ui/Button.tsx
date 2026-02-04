import { cn } from "@/lib/utils";
import { LucideIcon, Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
    size?: "sm" | "md" | "lg" | "icon";
    loading?: boolean;
    icon?: LucideIcon;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    className,
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    disabled,
    ...props
}, ref) => {
    const variants = {
        primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-sm",
        secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        outline: "bg-transparent border border-zinc-200 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/50",
        ghost: "bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
        danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20",
        success: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:ring-emerald-900/20",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "p-2",
    };

    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 cursor-pointer",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className={cn(size === "icon" ? "h-5 w-5" : "h-4 w-4")} />}
            {children}
        </button>
    );
});

Button.displayName = "Button";

export { Button };
