"use client";

import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    deleteDoc,
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
    MoreHorizontal,
    Edit2,
    Trash2,
    Mail,
    User as UserIcon,
    X
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ItemActions } from "@/components/ui/ItemActions";
import { Avatar } from "@/components/ui/Avatar";

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
    const { user: authUser, role: currentUserRole } = useAuth();
    const searchParams = useSearchParams();
    const initialDept = searchParams.get("dept") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [deptFilter, setDeptFilter] = useState(initialDept);
    const { success, error: toastError } = useToast();

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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
            success("User updated successfully");
            fetchData();
        } catch (error) {
            console.error("Error updating user", error);
            toastError("Failed to update user");
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        setUpdating(userId);
        try {
            await deleteDoc(doc(db, "users", userId));
            success("User deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting user", error);
            toastError("Failed to delete user");
        } finally {
            setUpdating(null);
        }
    };

    const handleEditSave = async () => {
        if (!editingUser) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "users", editingUser.id), {
                displayName: editName,
                email: editEmail
            });
            success("User details updated");
            setEditingUser(null);
            fetchData();
        } catch (error) {
            console.error("Error saving user details", error);
            toastError("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const openEditModal = (user: UserProfile) => {
        setEditingUser(user);
        setEditName(user.displayName || "");
        setEditEmail(user.email || "");
    };

    const currentUserProfile = users.find(u => u.id === authUser?.uid);
    const managerDeptId = currentUserRole === "Manager" ? currentUserProfile?.departmentId : null;

    const filteredUsers = users.filter((u: UserProfile) => {
        if (currentUserRole === "Manager") {
            return u.departmentId === managerDeptId;
        }
        if (deptFilter === "all") return true;
        return u.departmentId === deptFilter;
    });

    if (currentUserRole !== "Admin" && currentUserRole !== "Manager") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators and managers can view the team directory.</p>
            </div>
        );
    }

    const managerDeptName = managerDeptId ? departments.find(d => d.id === managerDeptId)?.name : null;

    return (
        <div className="space-y-8">
            <PageHeader
                title={currentUserRole === "Manager" ? `${managerDeptName || "Department"} Team` : "Team Directory"}
                description={currentUserRole === "Manager"
                    ? `Viewing members of the ${managerDeptName || "assigned"} department.`
                    : "Manage user permissions and roles for your organization."
                }
            />

            {currentUserRole === "Admin" && (
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
            )}

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
                                    {currentUserRole === "Admin" && <th className="px-6 py-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredUsers.map((user: UserProfile) => (
                                    <tr key={user.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar src={user.photoURL} name={user.displayName} />
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
                                            {currentUserRole === "Admin" ? (
                                                <select
                                                    disabled={updating === user.id}
                                                    value={user.departmentId || ""}
                                                    onChange={(e) => handleUpdate(user.id, { departmentId: e.target.value })}
                                                    className="bg-transparent text-sm font-medium text-zinc-600 dark:text-zinc-300 focus:outline-none cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                                >
                                                    <option value="" className="dark:bg-zinc-800">No Department</option>
                                                    {departments.map((d: Department) => (
                                                        <option key={d.id} value={d.id} className="dark:bg-zinc-800">{d.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                                    {departments.find(d => d.id === user.departmentId)?.name || "No Department"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {currentUserRole === "Admin" ? (
                                                    <select
                                                        disabled={updating === user.id}
                                                        value={user.role}
                                                        onChange={(e) => handleUpdate(user.id, { role: e.target.value as any })}
                                                        className="bg-transparent text-sm font-medium text-zinc-600 dark:text-zinc-300 focus:outline-none cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                                    >
                                                        <option value="Admin" className="dark:bg-zinc-800">Admin</option>
                                                        <option value="Manager" className="dark:bg-zinc-800">Manager</option>
                                                        <option value="Employee" className="dark:bg-zinc-800">Employee</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                                        {user.role}
                                                    </span>
                                                )}
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
                                        {currentUserRole === "Admin" && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditModal(user)}
                                                        disabled={!!updating}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="icon"
                                                        className="bg-transparent hover:bg-red-50"
                                                        onClick={() => handleDelete(user.id)}
                                                        disabled={!!updating}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Edit User Profile"
                description="Update the user's basic identification details."
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setEditingUser(null)}>
                            Cancel
                        </Button>
                        <Button
                            loading={isSaving}
                            onClick={handleEditSave}
                        >
                            Save Changes
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Display Name</label>
                        <Input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. John Doe"
                            icon={UserIcon}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
                        <Input
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="e.g. john@goabroad.com"
                            icon={Mail}
                            disabled // Keeping email disabled for now as it's the primary ID
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
