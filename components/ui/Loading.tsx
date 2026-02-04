import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
    className?: string;
    size?: "sm" | "md" | "lg";
}

export function Loading({ className, size = "md" }: LoadingProps) {
    const sizes = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    return (
        <div className={cn("flex items-center justify-center p-8", className)}>
            <Loader2 className={cn("animate-spin text-zinc-300", sizes[size])} />
        </div>
    );
}
