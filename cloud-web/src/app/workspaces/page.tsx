"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import Link from "next/link";
import { Plus, Loader2, FolderOpen } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export default function WorkspacesPage() {
  const router = useRouter();
  const { tokens, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { workspaces, fetchWorkspaces, isLoading } = useWorkspaceStore();
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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen px-6 py-12">
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

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Workspaces</h1>
            <p className="mt-1 text-sm text-zinc-400">Select a workspace or create a new one</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workspace name"
                autoFocus
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-16 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-white">No workspaces yet</h3>
            <p className="mt-1 text-sm text-zinc-400">Create your first workspace to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...workspaces].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspace/${workspace.id}/dashboard`}
                className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
              >
                <h3 className="font-semibold text-white group-hover:text-zinc-100">
                  {workspace.name}
                </h3>
                {workspace.description && (
                  <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{workspace.description}</p>
                )}
                <p className="mt-3 text-xs text-zinc-500">
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
