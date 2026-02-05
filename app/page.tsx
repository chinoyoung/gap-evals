"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { user, loading, error, signIn, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    clearError();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-50">
            GAP Evaluator
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Secure access for authorized team members
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-950/20 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10">
          <button
            onClick={signIn}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Please use your authorized email to access this platform.
          </p>
        </div>
      </motion.div>

      <div className="mt-8 text-xs font-medium uppercase tracking-widest text-zinc-300 dark:text-zinc-700">
        Internal Use Only
      </div>
    </div>
  );
}
