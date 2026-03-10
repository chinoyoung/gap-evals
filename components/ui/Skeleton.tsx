import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonQuestionItem() {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        {/* Type icon */}
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="flex flex-col gap-2">
          {/* Question text */}
          <Skeleton className="h-4 w-64 rounded" />
          {/* Meta row */}
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      {/* Body lines */}
      <div className="flex flex-col gap-2 px-1">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-4/5 rounded" />
        <Skeleton className="h-4 w-3/5 rounded" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonQuestionItem, SkeletonCard }
