"use client";

import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { Sun, Moon, Palette, Monitor } from "lucide-react";

const THEMES = [
  { id: "system" as const, label: "System", icon: Monitor },
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
  { id: "sepia" as const, label: "Sepia", icon: Palette },
  { id: "high-contrast" as const, label: "High Contrast", icon: Palette },
  { id: "ocean" as const, label: "Ocean", icon: Palette },
  { id: "midnight" as const, label: "Midnight", icon: Palette },
];

interface ThemeToggleProps {
  className?: string;
  variant?: "button" | "dropdown";
}

export function ThemeToggle({ className, variant = "button" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useUIStore();

  if (variant === "button") {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-surface",
          className
        )}
        title={`Current: ${theme}. Click to cycle.`}
      >
        {theme === "system" ? (
          <Monitor className="h-4 w-4" />
        ) : resolvedTheme === "light" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            theme === id
              ? "bg-surface text-foreground"
              : "text-muted hover:bg-surface/50 hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
