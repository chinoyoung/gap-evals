"use client";

import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
    User,
    Mail,
    Settings as SettingsIcon,
    Moon,
    Sun,
    Save,
    UserCircle,
    Building2,
    Shield,
    Eye,
    EyeOff,
    Type,
    Layout,
    Check
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const { user, userProfile, updateDisplayName } = useAuth();
    const { success, error } = useToast();

    const [name, setName] = useState(user?.displayName || "");
    const [isSaving, setIsSaving] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);

    const {
        density, setDensity,
        fontSize, setFontSize
    } = useSettings();

    useEffect(() => {
        if (user?.displayName) {
            setName(user.displayName);
        }
    }, [user]);

    useEffect(() => {
        const fetchDepartments = async () => {
            const snap = await getDocs(collection(db, "departments"));
            setDepartments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchDepartments();
    }, []);

    const userDept = departments.find(d => d.id === userProfile?.departmentId);

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            error("Name cannot be empty");
            return;
        }

        setIsSaving(true);
        try {
            await updateDisplayName(name);
            success("Profile updated successfully");
        } catch (err) {
            error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Account Settings"
                description="Manage your profile information and application preferences."
            />

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column: Summary & Quick Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <Avatar
                                src={user?.photoURL || undefined}
                                name={user?.displayName || undefined}
                                className="h-24 w-24 text-2xl"
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                                {user?.displayName || "User"}
                            </h3>
                            <div className="flex flex-col items-center gap-1 mt-1">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {user?.email}
                                </span>
                                {userProfile?.role && (
                                    <Badge variant="zinc" className="mt-1">
                                        {userProfile.role}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-6">
                        <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">Interface</h4>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Appearance</span>
                                    <p className="text-xs text-zinc-500">Light or dark theme</p>
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-dashed">
                        <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">Session Info</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">User ID</span>
                                <span className="font-mono text-zinc-400">{user?.uid.substring(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Last Login</span>
                                <span className="text-zinc-400">{new Date(user?.metadata.lastSignInTime || '').toLocaleDateString()}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Main Settings */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Job Transparency Section */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Shield className="h-5 w-5 text-zinc-400" />
                                Department & Role
                            </h3>
                        </div>
                        <div className="p-8">
                            <div className="grid gap-8 sm:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assigned Department</p>
                                            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                                                {userDept?.name || "Unassigned"}
                                            </h4>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 pl-13">
                                        {userDept?.description || "You are currently not assigned to a specific department. Contact your administrator if this is incorrect."}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Security Role</p>
                                            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                                                {userProfile?.role || "Member"}
                                            </h4>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 pl-13">
                                        {userProfile?.isAdmin ? "Full administrative access with system-wide permissions." : "Standard access for evaluations and results within your scope."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Personal Info Section */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <UserCircle className="h-5 w-5 text-zinc-400" />
                                Personal Information
                            </h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">
                                        Full Name
                                    </label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        icon={User}
                                        className="h-12 text-base"
                                    />
                                </div>
                                <div className="space-y-2 opacity-80">
                                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">
                                        Email Address
                                    </label>
                                    <Input
                                        value={user?.email || ""}
                                        disabled
                                        icon={Mail}
                                        className="h-12 bg-zinc-50 dark:bg-zinc-800 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button
                                    onClick={handleSaveProfile}
                                    loading={isSaving}
                                    className="h-12 px-8 rounded-2xl shadow-lg shadow-zinc-900/10"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Display & Accessibility Controls */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Layout className="h-5 w-5 text-zinc-400" />
                                Display & Accessibility
                            </h3>
                        </div>
                        <div className="p-8 space-y-10">
                            {/* Layout Density */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                        <Layout className="h-4 w-4 text-zinc-400" />
                                        Layout Density
                                    </h4>
                                    <p className="text-sm text-zinc-500">Choose how much information you want to see at once.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'comfortable', label: 'Comfortable', desc: 'More white space' },
                                        { id: 'compact', label: 'Compact', desc: 'More content per page' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setDensity(opt.id as any)}
                                            className={cn(
                                                "flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all",
                                                density === opt.id
                                                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                                    : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                                            )}
                                        >
                                            <span className="font-bold">{opt.label}</span>
                                            <span className={cn(
                                                "text-xs mt-1",
                                                density === opt.id ? "text-zinc-300 dark:text-zinc-500" : "text-zinc-500"
                                            )}>{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Size */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                        <Type className="h-4 w-4 text-zinc-400" />
                                        Text size
                                    </h4>
                                    <p className="text-sm text-zinc-500">Adjust the font size for better readability.</p>
                                </div>
                                <div className="flex gap-4">
                                    {[
                                        { id: 'base', label: 'Default', size: 'text-sm' },
                                        { id: 'lg', label: 'Larger', size: 'text-base' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFontSize(opt.id as any)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center h-12 rounded-2xl border-2 font-bold transition-all",
                                                fontSize === opt.id
                                                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                                    : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                                            )}
                                        >
                                            <span className={opt.size}>{opt.label}</span>
                                            {fontSize === opt.id && <Check className="ml-2 h-4 w-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
