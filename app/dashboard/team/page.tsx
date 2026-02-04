"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    orderBy
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
    Users,
    Shield,
    UserCircle,
    Briefcase,
    Loader2,
    AlertCircle,
    MoreVertical
} from "lucide-react";

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    role: "Admin" | "Manager" | "Employee";
    photoURL?: string;
    departmentId?: string;
}

interface Department {
    id: string;
    name: string;
}

export default function TeamPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <TeamDirectory />
        </Suspense>
    );
}

function TeamDirectory() {
    const { role: currentUserRole } = useAuth();
    const searchParams = useSearchParams();
    const initialDept = searchParams.get("dept") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [deptFilter, setDeptFilter] = useState(initialDept);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersSnap, deptsSnap] = await Promise.all([
                getDocs(query(collection(db, "users"), orderBy("email", "asc"))),
                getDocs(query(collection(db, "departments"), orderBy("name", "asc")))
            ]);

            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
            setDepartments(deptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (userId: string, data: Partial<UserProfile>) => {
        setUpdating(userId);
        try {
            await updateDoc(doc(db, "users", userId), data);
            fetchData();
        } catch (error) {
            console.error("Error updating user", error);
        } finally {
            setUpdating(null);
        }
    };

    const filteredUsers = users.filter(u => {
        if (deptFilter === "all") return true;
        return u.departmentId === deptFilter;
    });

    if (currentUserRole !== "Admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can manage the team.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Team Directory</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Manage user permissions and roles for @goabroad.com</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-500">Department:</span>
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="rounded-xl border-zinc-200 bg-white px-4 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800/50 dark:border-zinc-800">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Access Level</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}`}
                                                    className="h-10 w-10 rounded-full ring-2 ring-zinc-100 dark:ring-zinc-800"
                                                    alt=""
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.displayName || "Anonymous"}</span>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                disabled={updating === user.id}
                                                value={user.departmentId || ""}
                                                onChange={(e) => handleUpdate(user.id, { departmentId: e.target.value })}
                                                className="rounded-lg border-transparent bg-transparent py-1 text-sm font-medium focus:border-zinc-200 focus:ring-0 dark:text-zinc-300"
                                            >
                                                <option value="">No Department</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                disabled={updating === user.id}
                                                value={user.role}
                                                onChange={(e) => handleUpdate(user.id, { role: e.target.value as any })}
                                                className="rounded-lg border-transparent bg-transparent py-1 text-sm font-medium focus:border-zinc-200 focus:ring-0 dark:text-zinc-300"
                                            >
                                                <option value="Admin">Admin</option>
                                                <option value="Manager">Manager</option>
                                                <option value="Employee">Employee</option>
                                            </select>
                                            {updating === user.id && <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-zinc-400" />}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {user.role === "Admin" ? (
                                                    <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/20 dark:text-amber-500">
                                                        <Shield className="h-3 w-3" /> Full Access
                                                    </div>
                                                ) : user.role === "Manager" ? (
                                                    <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/20 dark:text-blue-500">
                                                        <Briefcase className="h-3 w-3" /> Management
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                        <UserCircle className="h-3 w-3" /> Standard
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
