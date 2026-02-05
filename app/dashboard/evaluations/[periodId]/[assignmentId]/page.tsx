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
    AlertCircle,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";

interface Question {
    id: string;
    text: string;
    type: "scale" | "paragraph";
    order?: number;
    scope?: "all" | "self";
}

interface Assignment {
    id: string;
    periodId: string;
    periodName: string;
    evaluatorId: string;
    evaluatorName: string;
    evaluateeId: string;
    evaluateeName: string;
    status: string;
    type: string;
    questions?: Question[];
    presetId?: string;
}

export default function EvaluationForm() {
    const { periodId, assignmentId } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (periodId && assignmentId && user) {
            fetchData();
        }
    }, [periodId, assignmentId, user]);

    const fetchData = async () => {
        try {
            // 1. Fetch Assignment
            const assignSnap = await getDoc(doc(db, `periods/${periodId}/assignments`, assignmentId as string));

            if (!assignSnap.exists()) {
                console.error("Assignment not found");
                return;
            }

            const data = assignSnap.data();
            const assignmentData = { id: assignSnap.id, ...data } as Assignment & { questions?: Question[], presetId?: string };

            if (data.status === 'completed') {
                router.push('/dashboard/evaluations');
                return;
            }
            setAssignment(assignmentData);

            let qs: Question[] = [];

            // 2. Determine Question Source
            if (assignmentData.questions && assignmentData.questions.length > 0) {
                // A. Use Snapshot
                qs = assignmentData.questions;
            } else if (assignmentData.presetId) {
                // B. Fetch via Preset
                const presetSnap = await getDoc(doc(db, "question_presets", assignmentData.presetId));
                if (presetSnap.exists()) {
                    const presetData = presetSnap.data();
                    if (presetData.questions && presetData.questions.length > 0) {
                        // Fetch actual valid questions from library
                        // Optimization: We fetch all questions. In a production app with thousands of questions, 
                        // we would use document lookups or an 'in' query.
                        const allQsSnap = await getDocs(collection(db, "questions"));
                        const allQs = allQsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));

                        // Map preset IDs to question objects, maintaining preset order
                        const questionMap = new Map(allQs.map(q => [q.id, q]));
                        qs = presetData.questions
                            .map((id: string) => questionMap.get(id))
                            .filter((q: Question | undefined): q is Question => !!q);
                    }
                }
            } else {
                // C. Legacy Fallback (Period Questions)
                const questSnap = await getDocs(query(collection(db, `periods/${periodId}/questions`), orderBy("order", "asc")));
                qs = questSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));

                // Apply Legacy Filtering
                if (data.type !== "Self") {
                    qs = qs.filter(q => q.scope === "all");
                }
            }

            setQuestions(qs);
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
                assignmentId: assignmentId,
                periodId: periodId,
                periodName: assignment?.periodName,
                evaluatorId: user?.uid,
                evaluatorName: assignment?.evaluatorName,
                evaluateeId: assignment?.evaluateeId,
                evaluateeName: assignment?.evaluateeName,
                type: assignment?.type,
                responses,
                submittedAt: Timestamp.now(),
            });

            await updateDoc(doc(db, `periods/${periodId}/assignments`, assignmentId as string), {
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

    if (!assignment) {
        return (
            <div className="py-20 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
                <h2 className="text-xl font-bold">Assignment not found</h2>
                <Link href="/dashboard/evaluations" className="mt-4 text-zinc-900 underline">Back to My Evaluations</Link>
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
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {assignment.periodName}
                </div>
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
                        { val: "N/A", label: "New / Not Applicable", desc: "Member has not been in position long enough to have demonstrated essential elements." }
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
                {questions.map((q, i) => {
                    const hasComment = responses[`${q.id}_comment`] !== undefined;

                    return (
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
                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <button
                                            type="button"
                                            onClick={() => handleScaleChange(q.id, "N/A")}
                                            className={`flex h-12 w-20 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${responses[q.id] === "N/A"
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
                                                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-all cursor-pointer ${responses[q.id] === val
                                                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                                                    : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                                    }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>

                                    {!hasComment ? (
                                        <div className="flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setResponses(prev => ({ ...prev, [`${q.id}_comment`]: "" }))}
                                                className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors uppercase tracking-widest"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                Add Comment
                                            </button>
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Supporting Context</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newResponses = { ...responses };
                                                        delete newResponses[`${q.id}_comment`];
                                                        setResponses(newResponses);
                                                    }}
                                                    className="text-[10px] uppercase font-black tracking-widest text-red-500 hover:text-red-600 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <textarea
                                                value={responses[`${q.id}_comment`] || ""}
                                                onChange={(e) => setResponses(prev => ({ ...prev, [`${q.id}_comment`]: e.target.value }))}
                                                placeholder="Provide additional context for this rating..."
                                                rows={3}
                                                className="w-full rounded-2xl border-zinc-100 bg-zinc-50 p-4 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/50"
                                            />
                                        </motion.div>
                                    )}
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
                    );
                })}

                <footer className="flex flex-col sm:flex-row items-center justify-between rounded-3xl bg-zinc-50 p-6 sm:p-8 dark:bg-zinc-900/50 gap-6">
                    <div className="flex items-center gap-3 text-zinc-500">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        <p className="text-sm font-medium">Responses are encrypted and secure</p>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting || Object.keys(responses).length < questions.length}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 cursor-pointer shadow-lg"
                    >
                        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        Submit Evaluation
                    </button>
                </footer>
            </form>
        </div>
    );
}
