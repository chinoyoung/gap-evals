"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where
} from "firebase/firestore";
import { CalendarDays, BarChart3, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

interface Period {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    resultsPublished?: boolean;
    createdAt?: any;
    isShared?: boolean;
}

export default function MyResultsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [periods, setPeriods] = useState<Period[]>([]);

    useEffect(() => {
        if (user) {
            fetchPeriods();
        }
    }, [user]);

    const fetchPeriods = async () => {
        try {
            const publishedPeriodsSnap = await getDocs(query(
                collection(db, "periods"),
                where("resultsPublished", "==", true)
            ));

            const sharedEvalSnap = await getDocs(query(
                collection(db, "evaluations"),
                where("shared", "==", true)
            ));

            const mySharedEvals = sharedEvalSnap.docs
                .map(d => d.data())
                .filter(ev =>
                    ev.evaluateeId === user?.uid ||
                    (ev.evaluateeName === user?.displayName && !ev.evaluateeId)
                );

            const sharedPeriodIds = new Set<string>(
                mySharedEvals.map(e => e.periodId).filter(Boolean)
            );
            const publishedPeriodIds = new Set<string>(
                publishedPeriodsSnap.docs.map(d => d.id)
            );

            const allPeriodIds = Array.from(
                new Set([...sharedPeriodIds, ...publishedPeriodIds])
            );

            if (allPeriodIds.length === 0) {
                setLoading(false);
                return;
            }

            const periodsData: Period[] = [];
            for (const pid of allPeriodIds) {
                const pSnap = await getDoc(doc(db, "periods", pid));
                if (pSnap.exists()) {
                    periodsData.push({
                        id: pSnap.id,
                        ...(pSnap.data() as Omit<Period, "id" | "isShared">),
                        isShared: sharedPeriodIds.has(pid) && !publishedPeriodIds.has(pid)
                    });
                }
            }

            setPeriods(
                periodsData.sort(
                    (a, b) =>
                        (b.createdAt?.toMillis?.() || 0) -
                        (a.createdAt?.toMillis?.() || 0)
                )
            );
        } catch (error) {
            console.error("Error fetching periods for results", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loading className="py-20" />;
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="My Performance Feedback"
                description="View your evaluation results by period."
            />

            {periods.length === 0 ? (
                <EmptyState
                    icon={BarChart3}
                    title="No results available"
                    description="Once administrators publish or share your evaluation feedback, it will appear here."
                    className="py-32"
                />
            ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                    {periods.map((period) => (
                        <Link key={period.id} href={`/dashboard/results/my-results/${period.id}`}>
                            <Card hoverable className="p-6 relative">
                                <div className="mb-4 flex items-start justify-between">
                                    <Badge
                                        variant={period.isShared ? "blue" : "emerald"}
                                        icon={period.isShared ? undefined : CheckCircle2}
                                    >
                                        {period.isShared ? "Shared" : "Published"}
                                    </Badge>
                                </div>

                                <h3 className="text-xl font-bold text-foreground leading-tight">
                                    {period.name}
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                    {period.description || "No description provided."}
                                </p>

                                <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-border">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        <span>
                                            {period.startDate
                                                ? new Date(period.startDate).toLocaleDateString()
                                                : "Set start date"}
                                        </span>
                                        <span>→</span>
                                        <span>
                                            {period.endDate
                                                ? new Date(period.endDate).toLocaleDateString()
                                                : "Set end date"}
                                        </span>
                                    </div>
                                </div>

                                <div className="absolute bottom-6 right-6 translate-x-0 sm:translate-x-4 opacity-100 sm:opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
