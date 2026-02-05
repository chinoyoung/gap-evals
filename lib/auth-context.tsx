"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    role: "Admin" | "Manager" | "Employee" | null;
    signIn: () => Promise<void>;
    logOut: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: null,
    role: null,
    signIn: async () => { },
    logOut: async () => { },
    clearError: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<"Admin" | "Manager" | "Employee" | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (!user.email?.endsWith("@goabroad.com")) {
                    await signOut(auth);
                    setUser(null);
                    setRole(null);
                    setError("Access denied");
                    setLoading(false);
                    return;
                }

                setUser(user);
                setError(null);

                // Fetch role from Firestore
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setRole(data.role);

                    // Update photoURL if it doesn't exist or is different
                    if (!data.photoURL || data.photoURL !== user.photoURL) {
                        await setDoc(userDocRef, {
                            photoURL: user.photoURL,
                            displayName: user.displayName || data.displayName
                        }, { merge: true });
                    }
                } else {
                    // Default role for new users
                    const defaultRole = "Employee";
                    await setDoc(userDocRef, {
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        role: defaultRole,
                        createdAt: new Date().toISOString(),
                    });
                    setRole(defaultRole);
                }
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        setError(null);
        try {
            await signInWithPopup(auth, provider);
        } catch (err: any) {
            console.error("Error signing in", err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError("Authentication failed");
            }
        }
    };

    const logOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider value={{ user, loading, error, role, signIn, logOut, clearError }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
