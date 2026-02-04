"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    Timestamp,
    query,
    orderBy
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Loader2,
    Send,
    Star,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import Link from "next/link";

interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    order?: number;
}

interface Assignment {
    id: string;
    evaluateeName: string;
    status: string;
}

export default function EvaluationForm() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (id && user) {
            fetchData();
        }
    }, [id, user]);

    const fetchData = async () => {
        try {
            const [assignSnap, questSnap] = await Promise.all([
                getDoc(doc(db, "assignments", id as string)),
                getDocs(collection(db, "questions"))
            ]);

            if (assignSnap.exists()) {
                const data = assignSnap.data();
                if (data.status === 'completed') {
                    router.push('/dashboard/evaluations');
                    return;
                }
                setAssignment({ id: assignSnap.id, ...data } as Assignment);
            }

            const qs = questSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            setQuestions(qs.sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999)));
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleScaleChange = (questionId: string, value: number | string) => {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    };

    const handleParagraphChange = (questionId: string, value: string) => {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await addDoc(collection(db, "evaluations"), {
                assignmentId: id,
                evaluatorId: user?.uid,
                evaluateeName: assignment?.evaluateeName,
                responses,
                submittedAt: Timestamp.now(),
            });

            await updateDoc(doc(db, "assignments", id as string), {
                status: "completed"
            });

            setSubmitted(true);
            setTimeout(() => router.push("/dashboard/evaluations"), 2000);
        } catch (error) {
            console.error("Error submitting evaluation", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500"
                >
                    <CheckCircle2 className="h-10 w-10" />
                </motion.div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Evaluation Submitted</h2>
                <p className="mt-2 text-zinc-500">Thank you for your feedback. Redirecting you back...</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <Link
                href="/dashboard/evaluations"
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Evaluations
            </Link>

            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Evaluating <span className="text-zinc-900 dark:text-zinc-100">{assignment?.evaluateeName}</span>
                </h1>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">Please provide honest and constructive feedback.</p>
            </header>

            <section className="rounded-3xl bg-zinc-50 p-8 ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Rating Definitions
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {[
                        { val: "10", label: "Exceptional", desc: "Performance is consistently superior and significantly exceeds position requirements." },
                        { val: "9", label: "Outstanding", desc: "Performance is outstanding and frequently exceeds position requirements." },
                        { val: "8", label: "Excellent", desc: "Performance is excellent and exceeds position requirements." },
                        { val: "7", label: "Good", desc: "Performance is good and consistently meets position requirements." },
                        { val: "6", label: "Above Average", desc: "Performance is above average and frequently meets position requirements." },
                        { val: "5", label: "Average", desc: "Performance is average." },
                        { val: "4", label: "Inconsistent", desc: "Performance meets some, but not all position requirements." },
                        { val: "3", label: "Below Average", desc: "Performance is below average and fails to meet position requirements." },
                        { val: "2", label: "Needs Improvement", desc: "Performance needs improvement and fails to meet position requirements." },
                        { val: "1", label: "Poor", desc: "Performance is poor and consistently fails to meet position requirements." },
                        { val: "N/A", label: "New / Not Applicable", desc: "Employee has not been in position long enough to have demonstrated essential elements." }
                    ].map((item) => (
                        <div key={item.val} className="flex gap-4 items-start">
                            <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">
                                {item.val}
                            </span>
                            <div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-none">{item.label}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-10">
                {questions.map((q, i) => (
                    <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                    >
                        <div className="mb-6 flex items-start gap-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 tracking-tighter">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 leading-tight pt-1">
                                {q.text}
                            </h3>
                        </div>

                        {q.type === "scale" ? (
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button
                                    type="button"
                                    onClick={() => handleScaleChange(q.id, "N/A")}
                                    className={`flex h-12 w-20 items-center justify-center rounded-xl text-xs font-bold transition-all ${responses[q.id] === "N/A"
                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                                        : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                        }`}
                                >
                                    N/A
                                </button>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => handleScaleChange(q.id, val)}
                                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-all ${responses[q.id] === val
                                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                                            : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                            }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                required
                                rows={4}
                                value={responses[q.id] || ""}
                                onChange={(e) => handleParagraphChange(q.id, e.target.value)}
                                placeholder="Share your thoughts here..."
                                className="w-full rounded-2xl border-zinc-200 bg-zinc-50 p-4 text-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                            />
                        )}
                    </motion.div>
                ))}

                <div className="flex items-center justify-between rounded-3xl bg-zinc-50 p-8 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3 text-zinc-500">
                        <AlertCircle className="h-5 w-5" />
                        <p className="text-sm font-medium">Your responses are stored securely.</p>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting || Object.keys(responses).length < questions.length}
                        className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-8 py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
                    >
                        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        Submit Evaluation
                    </button>
                </div>
            </form>
        </div>
    );
}
