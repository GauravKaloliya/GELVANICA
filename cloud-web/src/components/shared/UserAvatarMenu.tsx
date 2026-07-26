"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { ROUTES } from "@/lib/config/constants";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";

interface UserAvatarMenuProps {
  className?: string;
}

export function UserAvatarMenu({ className }: UserAvatarMenuProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const menuItems = React.useMemo(() => [
    { label: "Profile", icon: User, action: () => router.push(ROUTES.PROFILE) },
    { label: "Settings", icon: Settings, action: () => router.push(ROUTES.SETTINGS) },
    { label: "Sign out", icon: LogOut, action: () => { logout(); router.push(ROUTES.SIGN_IN); }, danger: true },
  ], [router, logout]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setFocusIndex(-1);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIndex((i) => Math.min(i + 1, menuItems.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocusIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && focusIndex >= 0 && menuItems[focusIndex]) {
        e.preventDefault();
        menuItems[focusIndex].action();
        closeMenu();
      }
      if (e.key === "Tab") { closeMenu(); }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, focusIndex, closeMenu, menuItems]);

  useEffect(() => {
    if (focusIndex >= 0 && menuRef.current) {
      const item = menuRef.current.querySelector(`[data-menu-index="${focusIndex}"]`) as HTMLElement;
      item?.focus();
    }
  }, [focusIndex]);

  if (!user) return null;

  const initials = getInitials(user.name);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User menu"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface"
      >
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
            {initials}
          </div>
        )}
        <ChevronDown className={cn("h-3 w-3 text-muted transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">{user.name || "User"}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>

          {menuItems.map((item, idx) => (
            <React.Fragment key={item.label}>
              {idx === 2 && <div role="separator" className="border-t border-border" />}
              <button
                role="menuitem"
                data-menu-index={idx}
                tabIndex={focusIndex === idx ? 0 : -1}
                onClick={() => { item.action(); closeMenu(); }}
                onMouseEnter={() => setFocusIndex(idx)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface",
                  item.danger ? "text-red-400" : "text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
