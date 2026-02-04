"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const addToast = React.useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const success = React.useCallback((msg: string) => addToast(msg, "success"), [addToast]);
    const error = React.useCallback((msg: string) => addToast(msg, "error"), [addToast]);
    const info = React.useCallback((msg: string) => addToast(msg, "info"), [addToast]);

    return (
        <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl p-4 pr-6 bg-white shadow-2xl ring-1 dark:bg-zinc-900 min-w-[300px]",
                                t.type === "success" && "ring-emerald-500/20",
                                t.type === "error" && "ring-red-500/20",
                                t.type === "info" && "ring-zinc-500/20"
                            )}
                        >
                            <div className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                t.type === "success" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
                                t.type === "error" && "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                                t.type === "info" && "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            )}>
                                {t.type === "success" && <CheckCircle2 className="h-5 w-5" />}
                                {t.type === "error" && <AlertCircle className="h-5 w-5" />}
                                {t.type === "info" && <Info className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                                {t.message}
                            </div>
                            <button
                                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
