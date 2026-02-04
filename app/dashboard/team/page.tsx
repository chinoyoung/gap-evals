"use client";

import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";
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
import {
    Users,
    Shield,
    UserCircle,
    Briefcase,
    Loader2,
    AlertCircle,
    MoreHorizontal
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";

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
        <Suspense fallback={<Loading className="py-20" />}>
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

    const filteredUsers = users.filter((u: UserProfile) => {
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
            <PageHeader
                title="Team Directory"
                description="Manage user permissions and roles for your organization."
            />

            <div className="flex items-center justify-end">
                <div className="w-64">
                    <Select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="all">All Departments</option>
                        {departments.map((d: Department) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </Select>
                </div>
            </div>

            <Card className="overflow-hidden">
                {loading ? (
                    <Loading className="py-20" />
                ) : filteredUsers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No team members found"
                        description="Try adjusting your filters or adding new members."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:bg-zinc-800/50 dark:border-zinc-800">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Access Level</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredUsers.map((user: UserProfile) => (
                                    <tr key={user.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-100 dark:ring-zinc-800">
                                                    <img
                                                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=18181b&color=fff`}
                                                        className="h-full w-full object-cover"
                                                        alt=""
                                                    />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                                        {user.displayName || "Anonymous User"}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                disabled={updating === user.id}
                                                value={user.departmentId || ""}
                                                onChange={(e) => handleUpdate(user.id, { departmentId: e.target.value })}
                                                className="bg-transparent text-sm font-medium text-zinc-600 dark:text-zinc-300 focus:outline-none cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                            >
                                                <option value="">No Department</option>
                                                {departments.map((d: Department) => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    disabled={updating === user.id}
                                                    value={user.role}
                                                    onChange={(e) => handleUpdate(user.id, { role: e.target.value as any })}
                                                    className="bg-transparent text-sm font-medium text-zinc-600 dark:text-zinc-300 focus:outline-none cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                                >
                                                    <option value="Admin">Admin</option>
                                                    <option value="Manager">Manager</option>
                                                    <option value="Employee">Employee</option>
                                                </select>
                                                {updating === user.id && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === "Admin" ? (
                                                <Badge variant="amber" icon={Shield}>Full Access</Badge>
                                            ) : user.role === "Manager" ? (
                                                <Badge variant="blue" icon={Briefcase}>Management</Badge>
                                            ) : (
                                                <Badge variant="zinc" icon={UserCircle}>Standard</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
