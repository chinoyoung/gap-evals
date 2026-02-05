"use client";

import React from "react";

interface AvatarProps {
    src?: string;
    name?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
}

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
    const sizeClasses = {
        xs: "h-5 w-5 text-[8px]",
        sm: "h-8 w-8 text-[10px]",
        md: "h-10 w-10 text-xs",
        lg: "h-12 w-12 text-sm",
        xl: "h-16 w-16 text-base",
    };

    const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
        : "?";

    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
    )}&background=18181b&color=fff&bold=true`;

    return (
        <div
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ring-1 ring-zinc-100 dark:ring-zinc-800 ${sizeClasses[size]} ${className}`}
        >
            {src ? (
                <img
                    src={src}
                    alt={name || "User Avatar"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackUrl;
                    }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {initials}
                </div>
            )}
        </div>
    );
}
