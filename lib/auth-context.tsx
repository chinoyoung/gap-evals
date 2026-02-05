"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    User
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query } from "firebase/firestore";
import { auth, db } from "./firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    role: string | null;
    isAdmin: boolean;
    canManageTeam: boolean;
    signIn: () => Promise<void>;
    logOut: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: null,
    role: null,
    isAdmin: false,
    canManageTeam: false,
    signIn: async () => { },
    logOut: async () => { },
    clearError: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [canManageTeam, setCanManageTeam] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // if (!user.email?.endsWith("@goabroad.com")) {
                //     await signOut(auth);
                //     setUser(null);
                //     setRole(null);
                //     setIsAdmin(false);
                //     setCanManageTeam(false);
                //     setError("Access denied");
                //     setLoading(false);
                //     return;
                // }

                setUser(user);
                setError(null);

                // Fetch role from Firestore
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const roleName = userData.role;
                    setRole(roleName);

                    // Fetch role flags from roles collection
                    try {
                        const rolesSnap = await getDocs(query(collection(db, "roles")));
                        const activeRole = rolesSnap.docs.find(d => d.data().name === roleName);
                        if (activeRole) {
                            const rd = activeRole.data();
                            setIsAdmin(!!rd.isAdmin);
                            setCanManageTeam(!!rd.canManageTeam);
                        } else {
                            // Fallback for legacy or unknown roles
                            setIsAdmin(roleName === "Admin");
                            setCanManageTeam(roleName === "Manager" || roleName === "Team Lead" || roleName === "Admin");
                        }
                    } catch (e) {
                        console.error("Error fetching role flags", e);
                    }

                    // Update photoURL if it doesn't exist or is different
                    if (!userData.photoURL || userData.photoURL !== user.photoURL) {
                        await setDoc(userDocRef, {
                            photoURL: user.photoURL,
                            displayName: user.displayName || userData.displayName
                        }, { merge: true });
                    }
                } else {
                    // Default role for new users
                    const defaultRole = "Member";
                    await setDoc(userDocRef, {
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        role: defaultRole,
                        createdAt: new Date().toISOString(),
                    });
                    setRole(defaultRole);
                    setIsAdmin(false);
                    setCanManageTeam(false);
                }
            } else {
                setUser(null);
                setRole(null);
                setIsAdmin(false);
                setCanManageTeam(false);
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
        <AuthContext.Provider value={{ user, loading, error, role, isAdmin, canManageTeam, signIn, logOut, clearError }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
