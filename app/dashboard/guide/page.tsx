"use client";

import { motion } from "framer-motion";
import {
    BookOpen,
    MessageSquare,
    Zap,
    Target,
    CheckCircle2,
    AlertCircle,
    Lightbulb,
    TrendingUp,
    ShieldCheck
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function EvaluationGuidePage() {
    const fadeIn = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 }
    };

    const principles = [
        {
            icon: Target,
            title: "Be Specific",
            description: "Avoid generic praise or criticism. Use concrete examples of projects, tasks, or behaviors to illustrate your points.",
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            icon: Zap,
            title: "Action-Oriented",
            description: "Don't just point out a problem; suggest a way forward. Feedback should always be tied to growth and improvement.",
            color: "text-amber-500",
            bg: "bg-amber-50 dark:bg-amber-900/20"
        },
        {
            icon: ShieldCheck,
            title: "Professional & Objective",
            description: "Focus on work performance and professional behaviors. Keep personal feelings or unrelated traits out of the evaluation.",
            color: "text-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
        }
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <header className="relative space-y-4 overflow-hidden rounded-[2.5rem] bg-foreground p-8 text-background lg:p-12">
                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-background/10"
                    >
                        <BookOpen className="h-6 w-6 text-background" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-bold tracking-tight lg:text-5xl"
                    >
                        Mastering the Art of <br />
                        <span className="text-background/60">Constructive Feedback</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 text-lg text-background/60"
                    >
                        High-quality evaluations are the engine of our team's growth. Learn how to provide insights that truly empower your colleagues.
                    </motion.p>
                </div>
                {/* Decorative element */}
                <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-background/5 blur-3xl" />
            </header>

            {/* Core Principles */}
            <section className="space-y-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground">Core Principles</h2>
                    <p className="mt-2 text-muted-foreground">The foundation of every great evaluation.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {principles.map((p, i) => (
                        <motion.div
                            key={p.title}
                            {...fadeIn}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="p-6">
                                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${p.bg} ${p.color}`}>
                                    <p.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {p.description}
                                </p>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* The SBI Framework */}
            <section className="grid gap-10 overflow-hidden rounded-[2rem] bg-muted/50 p-8 ring-1 ring-border lg:grid-cols-2 lg:p-12">
                <div className="space-y-6">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">The SBI Framework</h2>
                    <p className="text-muted-foreground">
                        The Situation-Behavior-Impact model is a simple tool to help you deliver clear, non-judgmental feedback.
                    </p>

                    <ul className="space-y-6">
                        <li className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">S</div>
                            <div>
                                <span className="font-bold text-foreground">Situation:</span>
                                <p className="text-sm text-muted-foreground">Define the when and where. Be specific about the context.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">B</div>
                            <div>
                                <span className="font-bold text-foreground">Behavior:</span>
                                <p className="text-sm text-muted-foreground">Describe the observable behavior without making assumptions about intent.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">I</div>
                            <div>
                                <span className="font-bold text-foreground">Impact:</span>
                                <p className="text-sm text-muted-foreground">Explain the effect the behavior had on the team, client, or project.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <Card className="p-6 shadow-xl">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Framework in Action
                    </h4>
                    <div className="mt-6 space-y-4">
                        <div className="rounded-lg border border-dashed border-border p-4">
                            <p className="text-sm font-medium text-muted-foreground italic">"During Tuesday's client presentation (Situation), you jumped in to explain the technical architecture when the client seemed confused (Behavior). This clearly resolved their concerns and helped us close the phase (Impact)."</p>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Better vs. Best */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-foreground">Upgrade Your Feedback</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-lg border border-red-100 dark:border-red-900/20 bg-red-50/30 dark:bg-red-900/5 p-8">
                        <div className="mb-4 flex items-center gap-2 text-red-600 font-bold">
                            <AlertCircle className="h-5 w-5" />
                            Avoid (Generic)
                        </div>
                        <p className="text-sm text-muted-foreground">
                            "You're a great team player and you work really hard on your projects."
                        </p>
                        <p className="mt-4 text-xs font-medium text-red-600/60 uppercase">
                            Why? It's nice, but gives no insight into what specifically should be continued.
                        </p>
                    </div>
                    <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-900/5 p-8">
                        <div className="mb-4 flex items-center gap-2 text-emerald-600 font-bold">
                            <TrendingUp className="h-5 w-5" />
                            Prefer (Specific)
                        </div>
                        <p className="text-sm text-muted-foreground">
                            "I really appreciate how you mentored the junior dev during the Sprint 4 refactoring. Your patience and clear explanations allowed them to finish their task 2 days early."
                        </p>
                        <p className="mt-4 text-xs font-medium text-emerald-600/60 uppercase">
                            Why? It highlights a specific skill (mentoring) and a measurable result.
                        </p>
                    </div>
                </div>
            </section>

            {/* Quick Tips */}
            <footer className="rounded-lg bg-muted/50 p-8">
                <h3 className="text-lg font-bold text-foreground">Quick Checklist</h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        "Is it based on data?",
                        "Is it timely?",
                        "Is it balanced?",
                        "Is it private?"
                    ].map((tip) => (
                        <div key={tip} className="flex items-center gap-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-foreground">{tip}</span>
                        </div>
                    ))}
                </div>
            </footer>
        </div>
    );
}
