"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useSession } from "@/lib/session";
import Link from "next/link";
import { Plus, Loader2, FolderOpen } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { user, isLoading: sessionLoading } = useSession();
  const { workspaces, fetchWorkspaces, isLoading } = useWorkspaceStore();
  const { tokens } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = 'Workspaces | Gnovium'
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }
    if (tokens?.access_token) {
      fetchWorkspaces(tokens.access_token);
    }
  }, [isAuthenticated, authLoading, tokens, fetchWorkspaces, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens?.access_token || !newName.trim()) return;
    setCreating(true);
    try {
      const workspace = await useWorkspaceStore.getState().createWorkspace(tokens.access_token, { name: newName.trim() });
      router.push(`/workspace/${workspace.id}/dashboard`);
    } catch {
      setCreating(false);
    }
  };

  if (authLoading || sessionLoading || isLoading) {
    return (
      <div className="min-h-screen px-6 py-12 grid-bg">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton variant="rectangular" className="h-10 w-36 rounded-lg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen px-6 py-12 grid-bg">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground display-heading">Workspaces</h1>
            <p className="mt-1 text-step-3 text-muted">Select a workspace or create a new one</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-border bg-card p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workspace name"
                autoFocus
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="rounded-lg bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-border bg-card py-16 text-center grid-bg">
            <FolderOpen className="mx-auto h-12 w-12 text-muted" />
            <h3 className="mt-4 text-lg font-medium text-foreground display-heading">No workspaces yet</h3>
            <p className="mt-1 text-step-3 text-muted">Create your first workspace to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...workspaces].sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()).map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspace/${workspace.id}/dashboard`}
                className="group rounded-lg border border-border bg-card p-5 transition-colors card-hover"
              >
                <h3 className="font-semibold text-foreground group-hover:text-foreground display-heading">
                  {workspace.name}
                </h3>
                {workspace.description && (
                  <p className="mt-1 text-step-3 text-muted line-clamp-2">{workspace.description}</p>
                )}
                <p className="mt-3 text-step-1 text-muted">
                  Updated {formatRelativeTime(workspace.updated_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
