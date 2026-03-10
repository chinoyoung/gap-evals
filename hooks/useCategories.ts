"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    Timestamp
} from "firebase/firestore";

export interface Category {
    id: string;
    name: string;
    createdAt: Timestamp;
}

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const q = query(collection(db, "question_categories"), orderBy("name", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Category[];
            setCategories(data);
            setLoading(false);
        }, (err) => {
            console.error("Error with real-time categories:", err);
            setError(err as Error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { categories, loading, error };
}
