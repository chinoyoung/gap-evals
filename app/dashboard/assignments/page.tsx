"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    Timestamp
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    User,
    ArrowRight,
    Users,
    AlertCircle
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NativeSelect as Select } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/Badge";
import { ItemActions } from "@/components/ui/ItemActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
} from "@/components/ui/table";

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    role: string;
    departmentId?: string;
}

interface Department {
    id: string;
    name: string;
}

interface Assignment {
    id: string;
    evaluatorId: string;
    evaluatorName: string;
    evaluateeId: string;
    evaluateeName: string;
    type: "peer" | "manager-to-employee" | "employee-to-manager" | "self";
    status: "pending" | "completed";
    createdAt: any;
}

export default function AssignmentsPage() {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deptFilter, setDeptFilter] = useState("all");

    const [evaluator, setEvaluator] = useState("");
    const [evaluatee, setEvaluatee] = useState("");
    const [type, setType] = useState<Assignment["type"]>("peer");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersSnap, deptsSnap, assignmentsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "departments")),
                getDocs(query(collection(db, "assignments"), orderBy("createdAt", "desc")))
            ]);

            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
            setDepartments(deptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
            setAssignments(assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAssignment = async (e: React.FormEvent) => {
        e.preventDefault();

        const actualEvaluateeId = type === "self" ? evaluator : evaluatee;
        if (!evaluator || !actualEvaluateeId) return;

        setSubmitting(true);
        const evalUser = users.find(u => u.id === evaluator);
        const targetUser = users.find(u => u.id === actualEvaluateeId);

        try {
            await addDoc(collection(db, "assignments"), {
                evaluatorId: evaluator,
                evaluatorName: evalUser?.displayName || evalUser?.email,
                evaluateeId: actualEvaluateeId,
                evaluateeName: targetUser?.displayName || targetUser?.email,
                type,
                status: "pending",
                createdAt: Timestamp.now(),
            });
            setIsAdding(false);
            setEvaluator("");
            setEvaluatee("");
            fetchData();
        } catch (error) {
            console.error("Error adding assignment", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this assignment?")) return;
        try {
            await deleteDoc(doc(db, "assignments", id));
            fetchData();
        } catch (error) {
            console.error("Error deleting assignment", error);
        }
    };

    const filteredAssignments = assignments.filter(a => {
        if (deptFilter === "all") return true;
        const evaluatee = users.find(u => u.id === a.evaluateeId);
        return evaluatee?.departmentId === deptFilter;
    });

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
                <p className="text-muted-foreground">Only administrators can manage assignments.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Evaluation Assignments"
                description="Assign evaluators to team members."
            >
                <Button onClick={() => setIsAdding(true)} icon={Plus}>
                    New Assignment
                </Button>
            </PageHeader>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="p-8">
                            <form onSubmit={handleAddAssignment} className="space-y-6">
                                <div className={`grid gap-6 ${type === "self" ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
                                    <Select
                                        label={type === "self" ? "Team Member" : "Evaluator"}
                                        value={evaluator}
                                        onChange={(e) => setEvaluator(e.target.value)}
                                    >
                                        <option value="">Select person</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                                        ))}
                                    </Select>

                                    {type !== "self" && (
                                        <Select
                                            label="Evaluatee"
                                            value={evaluatee}
                                            onChange={(e) => setEvaluatee(e.target.value)}
                                        >
                                            <option value="">Select Team Member</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                                            ))}
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Relationship Type</label>
                                    <div className="flex flex-wrap gap-3">
                                        {["peer", "manager-to-employee", "employee-to-manager", "self"].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t as any)}
                                                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${type === t
                                                    ? "bg-foreground text-background"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    }`}
                                            >
                                                {t.replace(/-/g, " ")}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                    <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={submitting}
                                        disabled={!evaluator || (type !== "self" && !evaluatee)}
                                    >
                                        Assign
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-muted-foreground">Filter by Department:</div>
                    <div className="w-64">
                        <Select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </Select>
                    </div>
                </div>

                <Card className="overflow-hidden">
                    {loading ? (
                        <Loading className="py-20" />
                    ) : filteredAssignments.length === 0 ? (
                        <EmptyState
                            className="border-none py-20"
                            icon={Users}
                            title="No assignments found"
                            description="No assignments found for this department."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evaluator</TableHead>
                                    <TableHead className="px-6 py-4 text-center"></TableHead>
                                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evaluatee</TableHead>
                                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</TableHead>
                                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                                    <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAssignments.map((a) => {
                                    const evaluatee = users.find(u => u.id === a.evaluateeId);
                                    const dept = departments.find(d => d.id === evaluatee?.departmentId);
                                    return (
                                        <TableRow key={a.id} className="group">
                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-foreground">{a.evaluatorName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <ArrowRight className="inline h-4 w-4 text-muted-foreground" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-foreground">{a.evaluateeName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-muted-foreground">
                                                    {dept?.name || "Unassigned"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="zinc">
                                                    {a.type.replace(/-/g, " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <ItemActions>
                                                    <Button
                                                        variant="danger"
                                                        size="icon"
                                                        className="bg-transparent hover:bg-destructive/10"
                                                        onClick={() => handleDelete(a.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </ItemActions>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>
        </div>
    );
}
