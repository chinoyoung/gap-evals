import * as React from "react"
import { ChevronDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface NativeSelectProps extends React.ComponentProps<"select"> {
  label?: string
  error?: string
  icon?: LucideIcon
}

function NativeSelect({
  className,
  label,
  error,
  icon: Icon,
  id,
  children,
  ...props
}: NativeSelectProps) {
  const generatedId = React.useId()
  const selectId = id ?? (label ? generatedId : undefined)

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative w-full">
        {Icon && (
          <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
        <select
          id={selectId}
          data-slot="native-select"
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            Icon && "pl-9",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <ChevronDown className="size-4" />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

export { NativeSelect }
export type { NativeSelectProps }
