import React from "react";
import { Hash, Type, Layers, List } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Question } from "@/components/ui/QuestionItem";

interface QuestionStatsProps {
    questions: Question[];
    categoryCount: number;
}

interface StatCardProps {
    icon: React.ReactNode;
    count: number;
    label: string;
}

function StatCard({ icon, count, label }: StatCardProps) {
    return (
        <Card className="px-5 py-4">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold text-foreground leading-none">
                        {count}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
            </div>
        </Card>
    );
}

export function QuestionStats({ questions, categoryCount }: QuestionStatsProps) {
    const scaleCount = questions.filter((q) => q.type === "scale").length;
    const textCount = questions.filter((q) => q.type === "paragraph").length;

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
                icon={<List className="h-4 w-4" />}
                count={questions.length}
                label="Total Questions"
            />
            <StatCard
                icon={<Hash className="h-4 w-4" />}
                count={scaleCount}
                label="Scale Questions"
            />
            <StatCard
                icon={<Type className="h-4 w-4" />}
                count={textCount}
                label="Text Questions"
            />
            <StatCard
                icon={<Layers className="h-4 w-4" />}
                count={categoryCount}
                label="Categories"
            />
        </div>
    );
}
