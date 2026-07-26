"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AtSign } from "lucide-react";

interface MentionUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  users: MentionUser[];
  onMentionSelect: (user: MentionUser) => void;
  className?: string;
  disabled?: boolean;
}

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  users,
  onMentionSelect,
  className,
  disabled,
}: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users.filter((u) => {
    const q = mentionQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const detectMention = useCallback(
    (text: string) => {
      const cursorPos = inputRef.current?.selectionStart || text.length;
      const textBeforeCursor = text.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowMentions(true);
        setSelectedIndex(0);
      } else {
        setShowMentions(false);
        setMentionQuery("");
      }
    },
    []
  );

  useEffect(() => {
    detectMention(value);
  }, [value, detectMention]);

  const insertMention = (user: MentionUser) => {
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    const mentionText = textBeforeCursor.replace(/@\w*$/, `@${user.name || user.email} `);
    onChange(mentionText + textAfterCursor);
    setShowMentions(false);
    onMentionSelect(user);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
      />
      {showMentions && filteredUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-1 neo-depth-zinc z-50"
          role="listbox"
        >
          {filteredUsers.map((user, idx) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              onMouseEnter={() => setSelectedIndex(idx)}
              role="option"
              aria-selected={idx === selectedIndex}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                idx === selectedIndex ? "bg-surface text-foreground" : "text-muted hover:bg-surface"
              )}
            >
              <AtSign className="h-3 w-3 text-muted" />
              <span className="font-medium">{user.name || user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
