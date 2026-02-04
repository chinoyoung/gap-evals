import { cn } from "@/lib/utils";

interface ItemActionsProps {
    children: React.ReactNode;
    className?: string;
    alwaysShowOnMobile?: boolean;
}

export function ItemActions({
    children,
    className,
    alwaysShowOnMobile = true
}: ItemActionsProps) {
    return (
        <div className={cn(
            "flex items-center gap-1 transition-all",
            alwaysShowOnMobile ? "opacity-100 sm:opacity-0" : "opacity-0",
            "group-hover:opacity-100",
            className
        )}>
            {children}
        </div>
    );
}
