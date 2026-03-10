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
    Edit2,
    Trash2,
    Mail,
    User as UserIcon,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    role: string;
    photoURL?: string;
    departmentId?: string;
}

interface Role {
    id: string;
    name: string;
    isAdmin?: boolean;
    canManageTeam?: boolean;
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
    const { user: authUser, role: currentUserRole, isAdmin, canManageTeam } = useAuth();
    const searchParams = useSearchParams();
    const initialDept = searchParams.get("dept") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
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
            const [usersSnap, deptsSnap, rolesSnap] = await Promise.all([
                getDocs(query(collection(db, "users"), orderBy("email", "asc"))),
                getDocs(query(collection(db, "departments"), orderBy("name", "asc"))),
                getDocs(query(collection(db, "roles"), orderBy("name", "asc")))
            ]);

            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
            setDepartments(deptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
            setRoles(rolesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role)));
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
    const managerDeptId = (canManageTeam && !isAdmin) ? currentUserProfile?.departmentId : null;

    const filteredUsers = users.filter((u: UserProfile) => {
        if (canManageTeam && !isAdmin) {
            return u.departmentId === managerDeptId;
        }
        if (deptFilter === "all") return true;
        return u.departmentId === deptFilter;
    });

    if (!canManageTeam && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-muted-foreground">Only administrators, managers, and team leads can view the team directory.</p>
            </div>
        );
    }

    const managerDeptName = managerDeptId ? departments.find(d => d.id === managerDeptId)?.name : null;

    return (
        <div className="space-y-8">
            <PageHeader
                title={(canManageTeam && !isAdmin) ? `${managerDeptName || "Department"} Team` : "Team Directory"}
                description={(canManageTeam && !isAdmin)
                    ? `Viewing members of the ${managerDeptName || "assigned"} department.`
                    : "Manage user permissions and roles for your organization."
                }
            />

            {isAdmin && (
                <div className="flex items-center justify-end">
                    <div className="w-64">
                        <NativeSelect
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {departments.map((d: Department) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </NativeSelect>
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
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User</TableHead>
                                <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department</TableHead>
                                <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</TableHead>
                                <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access Level</TableHead>
                                {currentUserRole === "Admin" && (
                                    <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user: UserProfile) => (
                                <TableRow key={user.id}>
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar src={user.photoURL} name={user.displayName} />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold text-foreground truncate">
                                                    {user.displayName || "Anonymous User"}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {user.email}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        {isAdmin ? (
                                            <NativeSelect
                                                disabled={updating === user.id}
                                                value={user.departmentId || ""}
                                                onChange={(e) => handleUpdate(user.id, { departmentId: e.target.value })}
                                                className="bg-transparent border-transparent text-sm font-medium text-muted-foreground focus-visible:border-ring"
                                            >
                                                <option value="">No Department</option>
                                                {departments.map((d: Department) => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </NativeSelect>
                                        ) : (
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {departments.find(d => d.id === user.departmentId)?.name || "No Department"}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin ? (
                                                <NativeSelect
                                                    disabled={updating === user.id}
                                                    value={user.role}
                                                    onChange={(e) => handleUpdate(user.id, { role: e.target.value })}
                                                    className="bg-transparent border-transparent text-sm font-medium text-muted-foreground focus-visible:border-ring"
                                                >
                                                    <option value="">No Role</option>
                                                    {roles.map((r) => (
                                                        <option key={r.id} value={r.name}>{r.name}</option>
                                                    ))}
                                                </NativeSelect>
                                            ) : (
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {user.role}
                                                </span>
                                            )}
                                            {updating === user.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        {(() => {
                                            const userRole = roles.find(r => r.name === user.role);
                                            if (userRole?.isAdmin) return <Badge variant="amber" icon={Shield}>Admin Access</Badge>;
                                            if (userRole?.canManageTeam) return <Badge variant="blue" icon={Briefcase}>Department Lead</Badge>;
                                            return <Badge variant="zinc" icon={UserCircle}>Team Member</Badge>;
                                        })()}
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell className="px-6 py-4 text-right">
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
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                        <Label>Display Name</Label>
                        <Input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. John Doe"
                            icon={UserIcon}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email Address</Label>
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
