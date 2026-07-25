"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { Entity, BlockType } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import AIPanel from "@/components/panels/AIPanel";
import BacklinksPanel from "@/components/panels/BacklinksPanel";
import EditorToolbar from "@/components/editor/EditorToolbar";
import EntityHeader from "@/components/editor/EntityHeader";
import PanelTabs from "@/components/editor/PanelTabs";
import type { Panel } from "@/components/editor/PanelTabs";
import BlockEditor from "@/components/editor/BlockEditor";
import AIQuickActions from "@/components/editor/AIQuickActions";
import TagsPanel from "@/components/panels/TagsPanel";
import RelationsPanel from "@/components/panels/RelationsPanel";
import CommentsPanel from "@/components/panels/CommentsPanel";
import ChildrenPanel from "@/components/panels/ChildrenPanel";
import ActivityPanel from "@/components/panels/ActivityPanel";
import PropertiesPanel from "@/components/panels/PropertiesPanel";
import HistoryPanel from "@/components/panels/HistoryPanel";
import { useEntity } from "@/hooks/useEntity";
import { useAuthStore } from "@/stores/authStore";
import { useEditorStore } from "@/stores/editorStore";
import { X, ChevronRight, Globe, Archive, Trash2, Share2, Download, Loader2 } from "lucide-react";

interface EditorEntity extends Entity {
  published?: boolean;
  state?: string;
}

const BLOCK_TYPES: BlockType[] = [
  "heading_1", "heading_2", "heading_3", "bulleted_list", "numbered_list",
  "to_do", "quote", "callout", "code", "image", "divider", "table", "toggle",
  "embed", "equation", "mention", "ai",
];

export default function EntityEditorPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const { blocks, fetchBlocks, addBlock, updateBlock, deleteBlock } = useEditorStore();
  const workspaceId = params.id as string;
  const entityId = params.entityId as string;

  const [entity, setEntity] = useState<EditorEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = tokens?.access_token;
  useEntity({ entityId, workspaceId });

  useEffect(() => {
    if (!token || !entityId) return;
    (async () => {
      try {
        const json = await apiClient.get<{ data: Entity }>(`/entities/${entityId}`);
        if (json.data) {
          setEntity(json.data as EditorEntity);
          document.title = `${json.data.title || 'Entity'} | Gnovium`;
        }
      } catch (e) { console.error('Failed to fetch entity:', e); } finally { setLoading(false); }
    })();
    fetchBlocks(token, entityId);
  }, [token, entityId, fetchBlocks]);

  const handlePublish = async () => {
    if (!entity) return;
    setActionLoading("publish");
    try {
      await apiClient.patch(`/entities/${entityId}`, { published: !entity.published });
      setEntity((p) => p ? { ...p, published: !p.published } : p);
      toast.success(entity.published ? "Unpublished" : "Published");
    } catch { toast.error("Failed to toggle publish"); }
    finally { setActionLoading(null); }
  };

  const handleArchive = async () => {
    setActionLoading("archive");
    try {
      await apiClient.patch(`/entities/${entityId}`, { state: "archived" });
      setEntity((p) => p ? { ...p, state: "archived" } : p);
      toast.success("Entity archived");
    } catch { toast.error("Failed to archive"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/entities/${entityId}`);
      toast.success("Entity deleted");
      window.location.href = `/workspace/${workspaceId}`;
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/workspace/${workspaceId}/entity/${entityId}`);
      toast.success("Link copied to clipboard");
    } catch { toast.error("Failed to copy link"); }
  };

  const handleExport = async () => {
    setActionLoading("export");
    try {
      const [eJson, bJson] = await Promise.all([
        apiClient.get<{ data: Entity }>(`/entities/${entityId}`),
        apiClient.get<{ data: unknown[] }>(`/entities/${entityId}/blocks`),
      ]);
      const payload = {
        entity: eJson.data || null,
        blocks: bJson.data || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${entity?.title || "entity"}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exported as JSON");
    } catch { toast.error("Failed to export"); }
    finally { setActionLoading(null); }
  };

  const handleAddBlock = async () => {
    if (!token) return;
    setSaving(true);
    try { await addBlock(token, { entity_id: entityId, block_type: "text", content: { text: "" } }); }
    finally { setSaving(false); }
  };

  const togglePanel = (panel: Panel) => setActivePanel(activePanel === panel ? null : panel);

  const handleFormat = (format: string) => {
    if (!token) return;
    if (BLOCK_TYPES.includes(format as BlockType)) {
      const id = selectedBlockId || blocks[blocks.length - 1]?.id;
      if (id) updateBlock(token, id, { block_type: format as BlockType });
    } else setActiveFormats((p) => p.includes(format) ? p.filter((f) => f !== format) : [...p, format]);
  };

  if (loading) {
    return (
      <div className="flex">
        <div className="flex-1 mx-auto max-w-4xl p-6 space-y-6">
          <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 flex-1 rounded-md" />)}
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton variant="rectangular" className="h-8 w-full" />
          <Skeleton variant="rectangular" className="h-24 w-full rounded-lg" />
          <Skeleton variant="rectangular" className="h-24 w-full rounded-lg" />
          <Skeleton variant="rectangular" className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!token) return null;

  const panelTitle = activePanel === "ai" ? "AI" : activePanel === "backlinks" ? "Backlinks"
    : activePanel === "properties" ? "Properties" : activePanel === "history" ? "History" : activePanel;

  const actionBtn = (
    label: string, icon: React.ReactNode, onClick: () => void,
    loadingKey?: string, danger?: boolean,
  ) => (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={!!loadingKey && actionLoading === loadingKey}
      className={danger ? "text-zinc-400 hover:text-red-400" : "text-zinc-400 hover:text-white"}>
      {actionLoading === loadingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </Button>
  );

  return (
    <div className="flex">
      <div className={`flex-1 mx-auto max-w-4xl p-6 space-y-6 ${activePanel ? "max-w-3xl" : ""}`}>
        <nav className="flex items-center gap-1.5 text-sm text-zinc-500">
          <Link href={`/workspace/${workspaceId}`} className="hover:text-white transition-colors">Workspace</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-zinc-300 truncate max-w-[240px]">{entity?.title || "Untitled"}</span>
        </nav>

        <EntityHeader token={token} workspaceId={workspaceId} entityId={entityId} entity={entity} onEntityChange={setEntity} />

        <div className="flex items-center gap-1 flex-wrap">
          {actionBtn(entity?.published ? "Unpublish" : "Publish", <Globe className="h-4 w-4" />, handlePublish, "publish")}
          {actionBtn("Archive", <Archive className="h-4 w-4" />, handleArchive, "archive")}
          {actionBtn("Delete", <Trash2 className="h-4 w-4" />, () => setShowDeleteConfirm(true), undefined, true)}
          <div className="h-5 w-px bg-zinc-800 mx-1" />
          {actionBtn("Share", <Share2 className="h-4 w-4" />, handleShare)}
          {actionBtn("Export", <Download className="h-4 w-4" />, handleExport, "export")}
        </div>

        <PanelTabs activePanel={activePanel} onTogglePanel={togglePanel} />
        <AIQuickActions token={token} workspaceId={workspaceId} entityId={entityId} />
        <EditorToolbar onFormat={handleFormat} activeFormats={activeFormats} />
        <BlockEditor blocks={blocks} token={token} onUpdateBlock={updateBlock} onDeleteBlock={deleteBlock}
          onAddBlock={handleAddBlock} onBlockSelect={setSelectedBlockId} readOnly={!token} />
      </div>

      {activePanel && (
        <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4 space-y-4 overflow-y-auto h-[calc(100vh-3.5rem)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white capitalize">{panelTitle}</h3>
            <button onClick={() => setActivePanel(null)} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          {activePanel === "tags" && <TagsPanel token={token} workspaceId={workspaceId} entityId={entityId} />}
          {activePanel === "relations" && <RelationsPanel token={token} entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "comments" && <CommentsPanel token={token} entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "children" && <ChildrenPanel token={token} entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "activity" && <ActivityPanel token={token} workspaceId={workspaceId} entityId={entityId} />}
          {activePanel === "ai" && <div className="h-full"><AIPanel entityId={entityId} entityTitle={entity?.title || "Untitled"} /></div>}
          {activePanel === "backlinks" && <BacklinksPanel entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "properties" && <PropertiesPanel entityId={entityId} />}
          {activePanel === "history" && <HistoryPanel entityId={entityId} />}
        </div>
      )}

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        title="Delete entity" description="This action cannot be undone. The entity and all its content will be permanently deleted."
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}
