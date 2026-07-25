"use client";

import { useState } from "react";
import { UserPlus, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { MEMBER_ROLES } from "@/lib/config/constants";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
}

export function InviteMemberModal({ open, onClose, onInvite }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onInvite(email.trim(), role);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEmail("");
        setRole("editor");
        onClose();
      }, 1200);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("editor");
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
              <UserPlus className="h-5 w-5 text-cyan-400" />
            </div>
            <DialogTitle>Invite Member</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium text-zinc-400">Email address</label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="invite-role" className="text-sm font-medium text-zinc-400">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {MEMBER_ROLES.filter((r) => r !== "owner").map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                    role === r
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600">
              {role === "viewer" && "Can view and comment, but cannot edit content"}
              {role === "editor" && "Can create, edit, and delete entities and content"}
              {role === "admin" && "Can manage members, settings, and all content"}
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className={cn(success && "bg-green-600 hover:bg-green-700")}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : success ? (
                <Check className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {success ? "Sent!" : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
