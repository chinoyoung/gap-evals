import React from "react";

export function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    // String.split with a capturing group produces alternating non-match / match segments:
    // index 0, 2, 4, … are non-match; index 1, 3, 5, … are the captured matches.
    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 rounded-sm px-0.5">
                {part}
            </mark>
        ) : (
            part
        )
    );
}
