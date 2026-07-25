"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";

type ShortcutHandler = (e: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description?: string;
}

const registeredShortcuts: ShortcutConfig[] = [];

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[] = []) {
  const { setCommandPaletteOpen, setSearchOpen } = useUIStore();

  useEffect(() => {
    const defaults: ShortcutConfig[] = [
      { key: "k", ctrl: true, handler: () => setCommandPaletteOpen(true), description: "Command Palette" },
      { key: "k", meta: true, handler: () => setCommandPaletteOpen(true), description: "Command Palette" },
      { key: "k", ctrl: true, shift: true, handler: () => setSearchOpen(true), description: "Search" },
      { key: "k", meta: true, shift: true, handler: () => setSearchOpen(true), description: "Search" },
      { key: "n", ctrl: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:new-entity")); }, description: "New Entity" },
      { key: "n", meta: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:new-entity")); }, description: "New Entity" },
      { key: "s", ctrl: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:save")); }, description: "Save" },
      { key: "s", meta: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:save")); }, description: "Save" },
      { key: "z", ctrl: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:undo")); }, description: "Undo" },
      { key: "z", meta: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:undo")); }, description: "Undo" },
      { key: "z", ctrl: true, shift: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:redo")); }, description: "Redo" },
      { key: "z", meta: true, shift: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:redo")); }, description: "Redo" },
      { key: "/", ctrl: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:ai-toggle")); }, description: "AI Toggle" },
      { key: "/", meta: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:ai-toggle")); }, description: "AI Toggle" },
      { key: "Delete", handler: () => { window.dispatchEvent(new CustomEvent("gnovium:soft-delete")); }, description: "Soft Delete" },
      { key: "Backspace", ctrl: true, handler: () => { window.dispatchEvent(new CustomEvent("gnovium:soft-delete")); }, description: "Soft Delete" },
    ];

    const all = [...defaults, ...shortcuts];
    registeredShortcuts.push(...all);

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of all) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      registeredShortcuts.splice(0, registeredShortcuts.length);
    };
  }, [shortcuts, setCommandPaletteOpen, setSearchOpen]);

  return { registeredShortcuts };
}
