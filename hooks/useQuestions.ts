"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    onSnapshot
} from "firebase/firestore";
import { Question } from "@/components/ui/QuestionItem";

export function useQuestions(periodId?: string) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const qPath = periodId ? `periods/${periodId}/questions` : "questions";
            const q = query(collection(db, qPath), orderBy("order", "asc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Question[];
            setQuestions(data);
        } catch (err) {
            console.error("Error fetching questions:", err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [periodId]);

    useEffect(() => {
        const qPath = periodId ? `periods/${periodId}/questions` : "questions";
        const q = query(collection(db, qPath), orderBy("order", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Question[];
            setQuestions(data);
            setLoading(false);
        }, (err) => {
            console.error("Error with real-time questions:", err);
            setError(err as Error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [periodId]);

    return { questions, loading, error, refetch: fetchQuestions, setQuestions };
}
