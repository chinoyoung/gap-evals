"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

type ToastType = "success" | "error" | "info"

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

// ToastProvider now just mounts the Sonner Toaster. The useToast hook
// calls sonner directly — no custom state needed.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

export function useToast(): ToastContextType {
  const toast = React.useCallback(
    (message: string, type: ToastType = "info") => {
      if (type === "success") sonnerToast.success(message)
      else if (type === "error") sonnerToast.error(message)
      else sonnerToast.info(message)
    },
    []
  )

  const success = React.useCallback(
    (message: string) => sonnerToast.success(message),
    []
  )

  const error = React.useCallback(
    (message: string) => sonnerToast.error(message),
    []
  )

  const info = React.useCallback(
    (message: string) => sonnerToast.info(message),
    []
  )

  return { toast, success, error, info }
}
