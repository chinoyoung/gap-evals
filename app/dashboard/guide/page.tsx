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
            bg: "bg-blue-50"
        },
        {
            icon: Zap,
            title: "Action-Oriented",
            description: "Don't just point out a problem; suggest a way forward. Feedback should always be tied to growth and improvement.",
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            icon: ShieldCheck,
            title: "Professional & Objective",
            description: "Focus on work performance and professional behaviors. Keep personal feelings or unrelated traits out of the evaluation.",
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        }
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <header className="relative space-y-4 overflow-hidden rounded-[2.5rem] bg-zinc-900 p-8 text-white lg:p-12 dark:bg-white dark:text-zinc-950">
                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 dark:bg-zinc-900/10"
                    >
                        <BookOpen className="h-6 w-6 text-white dark:text-zinc-900" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-bold tracking-tight lg:text-5xl"
                    >
                        Mastering the Art of <br />
                        <span className="text-zinc-400 dark:text-zinc-500">Constructive Feedback</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 text-lg text-zinc-400 dark:text-zinc-500"
                    >
                        High-quality evaluations are the engine of our team's growth. Learn how to provide insights that truly empower your colleagues.
                    </motion.p>
                </div>
                {/* Decorative element */}
                <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
            </header>

            {/* Core Principles */}
            <section className="space-y-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Core Principles</h2>
                    <p className="mt-2 text-zinc-500">The foundation of every great evaluation.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {principles.map((p, i) => (
                        <motion.div
                            key={p.title}
                            {...fadeIn}
                            transition={{ delay: i * 0.1 }}
                            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                        >
                            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${p.bg} ${p.color} dark:bg-zinc-800/50`}>
                                <p.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{p.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {p.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* The SBI Framework */}
            <section className="grid gap-10 overflow-hidden rounded-[2rem] bg-zinc-50 p-8 ring-1 ring-zinc-200 dark:bg-zinc-900/30 dark:ring-zinc-800 lg:grid-cols-2 lg:p-12">
                <div className="space-y-6">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">The SBI Framework</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        The Situation-Behavior-Impact model is a simple tool to help you deliver clear, non-judgmental feedback.
                    </p>

                    <ul className="space-y-6">
                        <li className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-950">S</div>
                            <div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-50">Situation:</span>
                                <p className="text-sm text-zinc-500">Define the when and where. Be specific about the context.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-950">B</div>
                            <div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-50">Behavior:</span>
                                <p className="text-sm text-zinc-500">Describe the observable behavior without making assumptions about intent.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-950">I</div>
                            <div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-50">Impact:</span>
                                <p className="text-sm text-zinc-500">Explain the effect the behavior had on the team, client, or project.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Framework in Action
                    </h4>
                    <div className="mt-6 space-y-4">
                        <div className="rounded-xl border border-dashed border-zinc-200 p-4 dark:border-zinc-800">
                            <p className="text-sm font-medium text-zinc-400 italic">"During Tuesday's client presentation (Situation), you jumped in to explain the technical architecture when the client seemed confused (Behavior). This clearly resolved their concerns and helped us close the phase (Impact)."</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Better vs. Best */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Upgrade Your Feedback</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-3xl border border-red-100 bg-red-50/30 p-8 dark:border-red-900/20 dark:bg-red-900/5">
                        <div className="mb-4 flex items-center gap-2 text-red-600 font-bold">
                            <AlertCircle className="h-5 w-5" />
                            Avoid (Generic)
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            "You're a great team player and you work really hard on your projects."
                        </p>
                        <p className="mt-4 text-xs font-medium text-red-600/60 uppercase">
                            Why? It's nice, but gives no insight into what specifically should be continued.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50/30 p-8 dark:border-emerald-900/20 dark:bg-emerald-900/5">
                        <div className="mb-4 flex items-center gap-2 text-emerald-600 font-bold">
                            <TrendingUp className="h-5 w-5" />
                            Prefer (Specific)
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            "I really appreciate how you mentored the junior dev during the Sprint 4 refactoring. Your patience and clear explanations allowed them to finish their task 2 days early."
                        </p>
                        <p className="mt-4 text-xs font-medium text-emerald-600/60 uppercase">
                            Why? It highlights a specific skill (mentoring) and a measurable result.
                        </p>
                    </div>
                </div>
            </section>

            {/* Quick Tips */}
            <footer className="rounded-3xl bg-zinc-50 p-8 dark:bg-zinc-900/50">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Quick Checklist</h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        "Is it based on data?",
                        "Is it timely?",
                        "Is it balanced?",
                        "Is it private?"
                    ].map((tip) => (
                        <div key={tip} className="flex items-center gap-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{tip}</span>
                        </div>
                    ))}
                </div>
            </footer>
        </div>
    );
}
