"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    addDoc,
    Timestamp,
    deleteDoc,
    doc
} from "firebase/firestore";
import {
    Plus,
    ChevronRight,
    Trash2,
    Calendar,
    FileEdit,
    CheckCircle2,
    AlertCircle,
    Archive,
    RotateCcw
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ItemActions } from "@/components/ui/ItemActions";
import { Separator } from "@/components/ui/separator";

interface Period {
    id: string;
    name: string;
    description: string;
    status: 'draft' | 'published';
    startDate: string;
    endDate: string;
    archived?: boolean;
    createdAt: any;
}

export default function PeriodsPage() {
    const { isAdmin } = useAuth();
    const [periods, setPeriods] = useState<Period[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);

    // Form state
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newStart, setNewStart] = useState("");
    const [newEnd, setNewEnd] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchPeriods();
    }, []);

    const fetchPeriods = async () => {
        try {
            const q = query(collection(db, "periods"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Period));
            setPeriods(data);
        } catch (error) {
            console.error("Error fetching periods:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || isCreating) return;

        setIsCreating(true);
        try {
            await addDoc(collection(db, "periods"), {
                name: newName,
                description: newDesc,
                startDate: newStart,
                endDate: newEnd,
                status: 'draft',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setShowNewModal(false);
            resetForm();
            fetchPeriods();
        } catch (error) {
            console.error("Error creating period:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleArchive = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const { updateDoc, doc } = await import("firebase/firestore");
            await updateDoc(doc(db, "periods", id), {
                archived: !currentStatus,
                updatedAt: Timestamp.now()
            });
            fetchPeriods();
        } catch (error) {
            console.error("Error toggling archive status:", error);
        }
    };

    const resetForm = () => {
        setNewName("");
        setNewDesc("");
        setNewStart("");
        setNewEnd("");
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-muted-foreground">Only administrators can manage evaluation periods.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Evaluation Periods"
                description="Manage review cycles, questions, and assignments."
            >
                <Button onClick={() => setShowNewModal(true)} icon={Plus}>
                    New Period
                </Button>
            </PageHeader>

            {loading ? (
                <Loading className="h-64" />
            ) : periods.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="No evaluation periods"
                    description="Create your first evaluation period to get started."
                >
                    <Button onClick={() => setShowNewModal(true)} icon={Plus}>
                        Create first period
                    </Button>
                </EmptyState>
            ) : (
                <div className="space-y-12">
                    {/* Active Periods */}
                    <div className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            {periods.filter(p => !p.archived).map((period) => (
                                <Link key={period.id} href={`/dashboard/periods/${period.id}`}>
                                    <Card hoverable className="p-6">
                                        <div className="mb-4 flex items-start justify-between">
                                            <Badge
                                                variant={period.status === 'published' ? "emerald" : "default"}
                                                icon={period.status === 'published' ? CheckCircle2 : FileEdit}
                                            >
                                                {period.status}
                                            </Badge>
                                            <ItemActions>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => handleToggleArchive(period.id, false, e)}
                                                    title="Archive Period"
                                                >
                                                    <Archive className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="icon"
                                                    className="bg-transparent hover:bg-destructive/10"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (confirm("Delete this period?")) {
                                                            deleteDoc(doc(db, "periods", period.id)).then(() => fetchPeriods());
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </ItemActions>
                                        </div>

                                        <h3 className="text-xl font-bold text-foreground leading-tight">
                                            {period.name}
                                        </h3>
                                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                            {period.description || "No description provided."}
                                        </p>

                                        <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-border">
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{period.startDate ? new Date(period.startDate).toLocaleDateString() : 'Set start date'}</span>
                                                <span>→</span>
                                                <span>{period.endDate ? new Date(period.endDate).toLocaleDateString() : 'Set end date'}</span>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-6 right-6 translate-x-0 sm:translate-x-4 opacity-100 sm:opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Archived Periods */}
                    {periods.some(p => p.archived) && (
                        <div className="space-y-6">
                            <Separator />
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Archived Cycles</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {periods.filter(p => p.archived).map((period) => (
                                    <Card key={period.id} className="bg-muted/30 p-6 group">
                                        <div className="mb-4 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Archived</span>
                                            <ItemActions>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => handleToggleArchive(period.id, true, e)}
                                                    title="Restore Period"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="icon"
                                                    className="bg-transparent hover:bg-destructive/10"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (confirm("Permanently delete this archived period?")) {
                                                            deleteDoc(doc(db, "periods", period.id)).then(() => fetchPeriods());
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </ItemActions>
                                        </div>
                                        <h4 className="text-base font-bold text-muted-foreground">{period.name}</h4>
                                        <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{period.description}</p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* New Period Modal */}
            <Modal
                isOpen={showNewModal}
                onClose={() => { setShowNewModal(false); resetForm(); }}
                title="Create Evaluation Period"
                description="Set up a new review cycle with dates and a description."
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => { setShowNewModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} loading={isCreating} disabled={!newName.trim()}>
                            Create Period
                        </Button>
                    </div>
                )}
            >
                <form onSubmit={handleCreate} className="space-y-6">
                    <Input
                        label="Period Name"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Q1 2024 Performance Review"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="date"
                            label="Start Date"
                            value={newStart}
                            onChange={(e) => setNewStart(e.target.value)}
                        />
                        <Input
                            type="date"
                            label="End Date"
                            value={newEnd}
                            onChange={(e) => setNewEnd(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <textarea
                            rows={3}
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="Brief summary of this evaluation cycle..."
                            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm transition-all focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
