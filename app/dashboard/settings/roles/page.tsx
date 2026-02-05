"use client";

import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    Timestamp
} from "firebase/firestore";
import {
    ShieldCheck,
    Plus,
    Trash2,
    Users,
    Shield,
    ArrowRight,
    Settings2,
    Save,
    X,
    AlertCircle,
    Info
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";

interface Role {
    id: string;
    name: string;
    description: string;
    canManageTeam?: boolean;
    isAdmin?: boolean;
}

interface Relationship {
    id: string;
    name: string;
    reviewerRoleId: string;
    revieweeRoleId: string;
}

export default function RolesSettingsPage() {
    const { isAdmin } = useAuth();
    const { success, error: toastError } = useToast();

    const [roles, setRoles] = useState<Role[]>([]);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showRelModal, setShowRelModal] = useState(false);

    // Form State
    const [roleName, setRoleName] = useState("");
    const [roleDesc, setRoleDesc] = useState("");
    const [roleCanManage, setRoleCanManage] = useState(false);
    const [roleIsAdmin, setRoleIsAdmin] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const [relName, setRelName] = useState("");
    const [reviewerRole, setReviewerRole] = useState("");
    const [revieweeRole, setRevieweeRole] = useState("");
    const [editingRel, setEditingRel] = useState<Relationship | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [rolesSnap, relsSnap] = await Promise.all([
                getDocs(query(collection(db, "roles"), orderBy("name", "asc"))),
                getDocs(query(collection(db, "role_relationships"), orderBy("name", "asc")))
            ]);

            setRoles(rolesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Role)));
            setRelationships(relsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Relationship)));
        } catch (err) {
            console.error("Error fetching roles/rels", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRole = async () => {
        if (!roleName) return;
        setIsSaving(true);
        try {
            const roleData = {
                name: roleName,
                description: roleDesc,
                canManageTeam: roleCanManage,
                isAdmin: roleIsAdmin,
                updatedAt: Timestamp.now()
            };

            if (editingRole) {
                await updateDoc(doc(db, "roles", editingRole.id), roleData);
                success("Role updated successfully.");
            } else {
                await addDoc(collection(db, "roles"), {
                    ...roleData,
                    createdAt: Timestamp.now()
                });
                success("Role created successfully.");
            }
            fetchData();
            setShowRoleModal(false);
            resetRoleForm();
        } catch (err) {
            toastError("Failed to save role.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRel = async () => {
        if (!relName || !reviewerRole || !revieweeRole) return;
        setIsSaving(true);
        try {
            const relData = {
                name: relName,
                reviewerRoleId: reviewerRole,
                revieweeRoleId: revieweeRole,
                updatedAt: Timestamp.now()
            };

            if (editingRel) {
                await updateDoc(doc(db, "role_relationships", editingRel.id), relData);
                success("Relationship updated successfully.");
            } else {
                await addDoc(collection(db, "role_relationships"), {
                    ...relData,
                    createdAt: Timestamp.now()
                });
                success("Relationship created successfully.");
            }
            fetchData();
            setShowRelModal(false);
            resetRelForm();
        } catch (err) {
            toastError("Failed to save relationship.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!confirm("Are you sure you want to delete this role? This may impact users assigned to this role.")) return;
        try {
            await deleteDoc(doc(db, "roles", id));
            success("Role deleted.");
            fetchData();
        } catch (err) {
            toastError("Failed delete role.");
        }
    };

    const handleDeleteRel = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await deleteDoc(doc(db, "role_relationships", id));
            success("Relationship deleted.");
            fetchData();
        } catch (err) {
            toastError("Failed delete relationship.");
        }
    };

    const resetRoleForm = () => {
        setRoleName("");
        setRoleDesc("");
        setRoleCanManage(false);
        setRoleIsAdmin(false);
        setEditingRole(null);
    };

    const resetRelForm = () => {
        setRelName("");
        setReviewerRole("");
        setRevieweeRole("");
        setEditingRel(null);
    };

    const openEditRole = (role: Role) => {
        setEditingRole(role);
        setRoleName(role.name);
        setRoleDesc(role.description);
        setRoleCanManage(!!role.canManageTeam);
        setRoleIsAdmin(!!role.isAdmin);
        setShowRoleModal(true);
    };

    const openEditRel = (rel: Relationship) => {
        setEditingRel(rel);
        setRelName(rel.name);
        setReviewerRole(rel.reviewerRoleId);
        setRevieweeRole(rel.revieweeRoleId);
        setShowRelModal(true);
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-zinc-500">Only administrators can manage roles and workflow.</p>
            </div>
        );
    }

    if (loading) return <Loading className="py-20" />;

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Roles & Workflow"
                description="Manage organizational roles and define evaluation relationships for the assignment wizard."
            />

            <div className="grid gap-8">
                {/* Roles Management */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-500" />
                                Organizational Roles
                            </h2>
                            <p className="text-sm text-zinc-500">Define the roles within your organization.</p>
                        </div>
                        <Button onClick={() => setShowRoleModal(true)} icon={Plus}>Add Role</Button>
                    </div>

                    <div className="grid gap-3">
                        {roles.length === 0 ? (
                            <Card className="p-8 text-center border-dashed">
                                <p className="text-sm text-zinc-500">No roles defined yet.</p>
                            </Card>
                        ) : roles.map((r) => (
                            <Card key={r.id} className="p-4 group">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{r.name}</h3>
                                            {r.isAdmin && <Badge variant="amber" icon={ShieldCheck} className="py-0.5 text-[10px]">Admin</Badge>}
                                            {r.canManageTeam && <Badge variant="blue" icon={Settings2} className="py-0.5 text-[10px]">Manager</Badge>}
                                        </div>
                                        <p className="text-xs text-zinc-500 pr-10">{r.description || "No description provided."}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditRole(r)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-900">
                                            <Save className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteRole(r.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-zinc-400 hover:text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Workflow Management */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ArrowRight className="h-5 w-5 text-emerald-500" />
                                Evaluation Workflow
                            </h2>
                            <p className="text-sm text-zinc-500">Define who reviews whom for the Bulk Wizard.</p>
                        </div>
                        <Button onClick={() => {
                            if (roles.length < 1) {
                                toastError("Create at least one role first.");
                                return;
                            }
                            setShowRelModal(true);
                        }} icon={Plus}>Add Relationship</Button>
                    </div>

                    <div className="grid gap-3">
                        {relationships.length === 0 ? (
                            <Card className="p-8 text-center border-dashed">
                                <p className="text-sm text-zinc-500">No relationships defined yet.</p>
                            </Card>
                        ) : relationships.map((rel) => {
                            const reviewer = roles.find(r => r.id === rel.reviewerRoleId);
                            const reviewee = roles.find(r => r.id === rel.revieweeRoleId);

                            return (
                                <Card key={rel.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="space-y-0.5 min-w-[100px]">
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate max-w-[120px]">{rel.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2.5 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-[10px] font-bold shadow-sm">
                                                        {reviewer?.name || "Deleted"}
                                                    </div>
                                                    <ArrowRight className="h-3 w-3 text-zinc-300" />
                                                    <div className="px-2.5 py-1 border-2 border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                                                        {reviewee?.name === "self" ? "Self" : (reviewee?.name || "Deleted")}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditRel(rel)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-900">
                                                <Save className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDeleteRel(rel.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-zinc-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            </div>

            {/* Role Modal */}
            <Modal
                isOpen={showRoleModal}
                onClose={() => { setShowRoleModal(false); resetRoleForm(); }}
                title={editingRole ? "Edit Role" : "Create New Role"}
                description="Roles allow you to group users and define permissions/workflows."
            >
                <div className="space-y-4 text-left">
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Role Name</label>
                            <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Senior Developer" className="px-3 py-2 h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                            <textarea
                                value={roleDesc}
                                onChange={e => setRoleDesc(e.target.value)}
                                className="w-full h-20 rounded-xl bg-zinc-50 border-none p-3 text-sm dark:bg-zinc-800 placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-zinc-900 transition-all dark:focus:ring-zinc-100"
                                placeholder="..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${roleCanManage ? "border-zinc-900 bg-zinc-900/5 dark:border-zinc-100 dark:bg-white/5" : "border-zinc-100 dark:border-zinc-800"}`}
                                onClick={() => setRoleCanManage(!roleCanManage)}
                            >
                                <div className={`h-5 w-5 rounded flex items-center justify-center border transition-all ${roleCanManage ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950" : "border-zinc-200 dark:border-zinc-700"}`}>
                                    {roleCanManage && <Save className="h-3 w-3" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold">Manage Department</p>
                                    <p className="text-[10px] text-zinc-500">Access to members and results.</p>
                                </div>
                            </label>

                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${roleIsAdmin ? "border-amber-500 bg-amber-500/5 dark:border-amber-400 dark:bg-amber-400/5" : "border-zinc-100 dark:border-zinc-800"}`}
                                onClick={() => setRoleIsAdmin(!roleIsAdmin)}
                            >
                                <div className={`h-5 w-5 rounded flex items-center justify-center border transition-all ${roleIsAdmin ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700"}`}>
                                    {roleIsAdmin && <ShieldCheck className="h-3 w-3" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold">Admin Power</p>
                                    <p className="text-[10px] text-zinc-500">Full system configuration access.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="ghost" className="flex-1 text-xs" onClick={() => { setShowRoleModal(false); resetRoleForm(); }}>Cancel</Button>
                        <Button className="flex-1 text-xs" loading={isSaving} onClick={handleSaveRole}>
                            {editingRole ? "Update Role" : "Create Role"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Relationship Modal */}
            <Modal
                isOpen={showRelModal}
                onClose={() => { setShowRelModal(false); resetRelForm(); }}
                title={editingRel ? "Edit Relationship" : "Add Relationship Rule"}
                description="Define how evaluation assignments should be suggested in the bulk wizard."
            >
                <div className="space-y-4 text-left">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Label</label>
                        <Input value={relName} onChange={e => setRelName(e.target.value)} placeholder="e.g. Peer Review" className="h-10 rounded-xl px-3" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reviewer Role</label>
                            <select
                                value={reviewerRole}
                                onChange={e => setReviewerRole(e.target.value)}
                                className="w-full rounded-xl bg-zinc-50 border-none p-3 text-sm dark:bg-zinc-800 outline-none h-10"
                            >
                                <option value="">Select...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reviewee Role</label>
                            <select
                                value={revieweeRole}
                                onChange={e => setRevieweeRole(e.target.value)}
                                className="w-full rounded-xl bg-zinc-50 border-none p-3 text-sm dark:bg-zinc-800 outline-none h-10"
                            >
                                <option value="">Select...</option>
                                <option value="self">Self (Same)</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex gap-2 text-[11px] text-zinc-500 leading-tight">
                        <Info className="h-4 w-4 shrink-0 text-zinc-400" />
                        <p>This rule defines the relationship in the Bulk Wizard.</p>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button variant="ghost" className="flex-1 text-xs" onClick={() => { setShowRelModal(false); resetRelForm(); }}>Cancel</Button>
                    <Button className="flex-1 text-xs" loading={isSaving} onClick={handleSaveRel}>
                        {editingRel ? "Update Rule" : "Create Rule"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
