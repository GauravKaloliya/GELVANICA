"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Loader2, Palette, ArrowRight, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/apiClient";

const ACCENT_COLORS = [
  { name: "Emerald", value: "#10b981", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500", ring: "ring-blue-500" },
  { name: "Violet", value: "#8b5cf6", bg: "bg-violet-500", ring: "ring-violet-500" },
  { name: "Rose", value: "#f43f5e", bg: "bg-rose-500", ring: "ring-rose-500" },
  { name: "Amber", value: "#f59e0b", bg: "bg-amber-500", ring: "ring-amber-500" },
  { name: "Cyan", value: "#06b6d4", bg: "bg-cyan-500", ring: "ring-cyan-500" },
  { name: "Slate", value: "#64748b", bg: "bg-slate-500", ring: "ring-slate-500" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-500", ring: "ring-pink-500" },
];

type Step = "workspace" | "customize" | "invite";

export default function OnboardingPage() {
  const router = useRouter();
  const { tokens, isAuthenticated, isLoading } = useAuthStore();
  const { createWorkspace } = useWorkspaceStore();
  const [step, setStep] = useState<Step>("workspace");
  const [workspaceName, setWorkspaceName] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0].value);
  const [inviteEmails, setInviteEmails] = useState("");
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens?.access_token || !workspaceName.trim()) return;

    setLoading(true);
    setError("");
    try {
      const workspace = await createWorkspace(tokens.access_token, {
        name: workspaceName.trim(),
        description: description.trim() || undefined,
        settings: { accent_color: accentColor },
      });
      setCreatedWorkspaceId(workspace.id);
      setStep("customize");
    } catch {
      setError("Failed to create workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMembers = async () => {
    if (!tokens?.access_token || !createdWorkspaceId || !inviteEmails.trim()) {
      router.push(`/workspace/${createdWorkspaceId}/dashboard`);
      return;
    }

    setLoading(true);
    try {
      const emails = inviteEmails.split(",").map((e) => e.trim()).filter(Boolean);
      await Promise.all(
        emails.map((email) =>
          apiClient.post(`/workspaces/${createdWorkspaceId}/members`, {
            email,
            role: "editor",
          })
        )
      );
    } catch {
      // Non-critical — workspace already created
    } finally {
      setLoading(false);
      router.push(`/workspace/${createdWorkspaceId}/dashboard`);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-8">
          <div className="space-y-3 text-center">
            <Skeleton className="mx-auto h-9 w-64" />
            <Skeleton className="mx-auto h-4 w-48" />
          </div>
          <div className="space-y-4">
            <Skeleton variant="rectangular" className="h-12 w-full rounded-lg" />
            <Skeleton variant="rectangular" className="h-24 w-full rounded-lg" />
            <Skeleton variant="rectangular" className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          {(["workspace", "customize", "invite"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-white text-black"
                    : i < (["workspace", "customize", "invite"] as Step[]).indexOf(step)
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {i < (["workspace", "customize", "invite"] as Step[]).indexOf(step) ? (
                  <Check size={14} />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="w-8 h-px bg-zinc-700" />}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to Gnovium</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {step === "workspace"
              ? "Create your first workspace to get started"
              : step === "customize"
              ? "Make it yours"
              : "Invite your team (optional)"}
          </p>
        </div>

        {/* Step 1: Workspace */}
        {step === "workspace" && (
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="onboarding-workspace-name" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Workspace Name
              </label>
              <input
                id="onboarding-workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                placeholder="My Knowledge Base"
              />
            </div>

            <div>
              <label htmlFor="onboarding-description" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Description (optional)
              </label>
              <textarea
                id="onboarding-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none resize-none"
                placeholder="What is this workspace for?"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !workspaceName.trim()}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight size={14} /></>}
            </button>
          </form>
        )}

        {/* Step 2: Accent Color */}
        {step === "customize" && (
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
                <Palette size={16} />
                Accent Color
              </label>
              <div className="grid grid-cols-4 gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={`relative w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                      accentColor === color.value
                        ? `border-white ring-2 ${color.ring}`
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: color.value + "20" }}
                  >
                    <div className={`w-8 h-8 rounded-full ${color.bg}`} />
                    {accentColor === color.value && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <Check size={10} className="text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("invite")}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={14} />
            </button>

            <button
              onClick={() => router.push(`/workspace/${createdWorkspaceId}/dashboard`)}
              className="w-full text-center text-sm text-zinc-400 hover:text-white"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3: Invite Members */}
        {step === "invite" && (
          <div className="space-y-6">
            <div>
              <label htmlFor="invite-emails" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Invite Team Members
              </label>
              <textarea
                id="invite-emails"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none resize-none"
                placeholder="Enter emails separated by commas&#10;alice@example.com, bob@example.com"
              />
              <p className="mt-1 text-xs text-zinc-500">Members will receive an email invitation with the Editor role.</p>
            </div>

            <button
              onClick={handleInviteMembers}
              disabled={loading}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invites & Go to Dashboard"}
            </button>

            <button
              onClick={() => router.push(`/workspace/${createdWorkspaceId}/dashboard`)}
              className="w-full text-center text-sm text-zinc-400 hover:text-white"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
