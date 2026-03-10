"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="rounded-lg p-10 shadow-sm">
          <CardContent className="space-y-8 px-0">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6">
                <Logo size="lg" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                GAP Evaluator
              </h1>
              <p className="mt-2 text-muted-foreground">
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
                  <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <Button
                onClick={signIn}
                className="group w-full rounded-lg py-3.5 h-auto gap-3"
              >
                <LogIn className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
                Continue with Google
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Please use your authorized email to access this platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="mt-8 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
        Internal Use Only
      </div>
    </div>
  );
}
