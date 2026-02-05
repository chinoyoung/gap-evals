"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Density = "comfortable" | "compact";
type FontSize = "base" | "lg";

interface SettingsContextType {
    density: Density;
    fontSize: FontSize;
    setDensity: (density: Density) => void;
    setFontSize: (fontSize: FontSize) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [density, setDensity] = useState<Density>("comfortable");
    const [fontSize, setFontSize] = useState<FontSize>("base");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedDensity = localStorage.getItem("ui-density") as Density;
        const savedFontSize = localStorage.getItem("ui-font-size") as FontSize;

        if (savedDensity) setDensity(savedDensity);
        if (savedFontSize) setFontSize(savedFontSize);

        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("ui-density", density);
        localStorage.setItem("ui-font-size", fontSize);

        // Apply attributes to html root for CSS targeting
        const root = document.documentElement;
        root.setAttribute("data-density", density);
        root.setAttribute("data-font-size", fontSize);
    }, [density, fontSize, mounted]);

    return (
        <SettingsContext.Provider value={{
            density,
            fontSize,
            setDensity,
            setFontSize
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
