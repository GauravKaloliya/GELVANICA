import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "system" | "light" | "dark" | "sepia" | "high-contrast" | "ocean" | "midnight";

type PanelId = "properties" | "ai" | "comments" | "backlinks" | "history";

interface UIState {
  theme: Theme;
  resolvedTheme: "light" | "dark" | "sepia" | "high-contrast" | "ocean" | "midnight";
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  activeRightPanel: PanelId | null;
  commandPaletteOpen: boolean;
  searchOpen: boolean;
  activeModal: string | null;
  isMobile: boolean;
  isOnline: boolean;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openRightPanel: (panel: PanelId) => void;
  closeRightPanel: () => void;
  toggleRightPanel: (panel: PanelId) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsOnline: (isOnline: boolean) => void;
}

const THEMES_EXCL_SYSTEM: Theme[] = ["dark", "light", "sepia", "high-contrast", "ocean", "midnight"];
const THEME_ORDER: Theme[] = ["system", ...THEMES_EXCL_SYSTEM];

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" | "sepia" | "high-contrast" | "ocean" | "midnight" {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyThemeToDOM(resolved: "light" | "dark" | "sepia" | "high-contrast" | "ocean" | "midnight") {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.add("theme-transitioning");
  (THEMES_EXCL_SYSTEM as string[]).forEach((t) => html.classList.remove(t));
  html.classList.add(resolved);
  setTimeout(() => html.classList.remove("theme-transitioning"), 300);
}

if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const { theme } = useUIStore.getState();
    if (theme === "system") {
      const resolved = resolveTheme("system");
      applyThemeToDOM(resolved);
      useUIStore.setState({ resolvedTheme: resolved });
    }
  });
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "system" as Theme,
      resolvedTheme: "dark" as "light" | "dark" | "sepia" | "high-contrast" | "ocean" | "midnight",
      sidebarCollapsed: false,
      rightPanelOpen: false,
      activeRightPanel: null,
      commandPaletteOpen: false,
      searchOpen: false,
      activeModal: null,
      isMobile: false,
      isOnline: true,

      setTheme: (theme) => {
        const resolved = resolveTheme(theme);
        set({ theme, resolvedTheme: resolved });
        applyThemeToDOM(resolved);
        if (typeof window !== "undefined") {
          localStorage.setItem("gnovium-theme", theme);
        }
      },

      toggleTheme: () => {
        const current = get().theme;
        const idx = THEME_ORDER.indexOf(current);
        const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
        get().setTheme(next);
      },

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      openRightPanel: (panel) => set({ rightPanelOpen: true, activeRightPanel: panel }),
      closeRightPanel: () => set({ rightPanelOpen: false, activeRightPanel: null }),
      toggleRightPanel: (panel) => {
        const state = get();
        if (state.activeRightPanel === panel && state.rightPanelOpen) {
          set({ rightPanelOpen: false, activeRightPanel: null });
        } else {
          set({ rightPanelOpen: true, activeRightPanel: panel });
        }
      },

      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set({ commandPaletteOpen: !get().commandPaletteOpen }),

      setSearchOpen: (open) => set({ searchOpen: open }),
      toggleSearch: () => set({ searchOpen: !get().searchOpen }),

      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      setIsMobile: (isMobile) => set({ isMobile }),
      setIsOnline: (isOnline) => set({ isOnline }),
    }),
    {
      name: "gnovium-ui",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveTheme(state.theme);
          state.resolvedTheme = resolved;
          if (typeof document !== "undefined") {
            applyThemeToDOM(resolved);
          }
        }
      },
    }
  )
);
