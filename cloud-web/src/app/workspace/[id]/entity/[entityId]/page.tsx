"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { Block, Entity, EntityType, BlockType } from "@/lib/types";
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
import { useAuthStore } from "@/stores/authStore";
import { useEditorStore } from "@/stores/editorStore";
import { configService } from "@/lib/services/configService";
import { X, ChevronRight, Globe, Archive, Trash2, Share2, Download, Loader2 } from "lucide-react";

interface EditorEntity extends Entity {
  published?: boolean;
  state?: string;
}

export default function EntityEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { tokens } = useAuthStore();
  const { blocks, fetchBlocks, addBlock, updateBlock, deleteBlock } = useEditorStore();
  const workspaceId = params.id as string;
  const entityId = params.entityId as string;
  const creatingRef = useRef(false);

  const [entity, setEntity] = useState<EditorEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([]);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [defaultEntityTypeId, setDefaultEntityTypeId] = useState("");

  const token = tokens?.access_token;

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdateBlock = useCallback(
    (t: string, wid: string, id: string, data: Parameters<typeof updateBlock>[3]) => {
      if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
      debounceTimers.current[id] = setTimeout(() => {
        updateBlock(t, wid, id, data);
        delete debounceTimers.current[id];
      }, 400);
    },
    [updateBlock]
  );

  useEffect(() => {
    configService.get(workspaceId).then(c => {
      if ((c.block_types ?? []).length > 0) setBlockTypes(c.block_types as BlockType[]);
    }).catch(() => {});
    apiClient.get<{ data: EntityType[] }>(`/workspaces/${workspaceId}/entities/types`)
      .then((res) => {
        const types = res.data || [];
        if (types.length > 0) setDefaultEntityTypeId(types[0].id);
      })
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!token || !entityId || entityId === "new") {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const json = await apiClient.get<{ data: { entity: Entity; blocks?: Block[] } }>(`/workspaces/${workspaceId}/entities/${entityId}`);
        if (json.data?.entity) {
          setEntity(json.data.entity as EditorEntity);
          document.title = `${json.data.entity.name || 'Entity'} | Gnovium`;
        }
      } catch (e) { console.error('Failed to fetch entity:', e); } finally { setLoading(false); }
    })();
    fetchBlocks(token, workspaceId, entityId);
  }, [token, workspaceId, entityId, fetchBlocks]);

  const handlePublish = async () => {
    if (!entity) return;
    setActionLoading("publish");
    try {
      await apiClient.patch(`/workspaces/${workspaceId}/entities/${entityId}`, { published: !entity.published });
      setEntity((p) => p ? { ...p, published: !p.published } : p);
      toast.success(entity.published ? "Unpublished" : "Published");
    } catch { toast.error("Failed to toggle publish"); }
    finally { setActionLoading(null); }
  };

  const handleArchive = async () => {
    setActionLoading("archive");
    try {
      await apiClient.patch(`/workspaces/${workspaceId}/entities/${entityId}`, { state: "archived" });
      setEntity((p) => p ? { ...p, state: "archived" } : p);
      toast.success("Entity archived");
    } catch { toast.error("Failed to archive"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/workspaces/${workspaceId}/entities/${entityId}`);
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
        apiClient.get<{ data: { entity: Entity; blocks?: Block[] } }>(`/workspaces/${workspaceId}/entities/${entityId}`),
        apiClient.get<{ data: Block[] }>(`/workspaces/${workspaceId}/blocks/?entity_id=${entityId}`),
      ]);
      const payload = {
        entity: eJson.data?.entity || null,
        blocks: bJson.data || eJson.data?.blocks || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${entity?.name || "entity"}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exported as JSON");
    } catch { toast.error("Failed to export"); }
    finally { setActionLoading(null); }
  };

  const handleAddBlock = async () => {
    if (!token || creatingRef.current) return;
    if (entityId === "new") {
      creatingRef.current = true;
      try {
        const res = await apiClient.post<{ data: Entity }>(`/workspaces/${workspaceId}/entities/`, {
          workspace_id: workspaceId,
          ...(defaultEntityTypeId ? { entity_type_id: defaultEntityTypeId } : {}),
          name: entity?.name || "Untitled",
        });
        router.replace(`/workspace/${workspaceId}/entity/${res.data.id}`);
      } catch {
        toast.error("Failed to create entity");
        creatingRef.current = false;
      }
      return;
    }
    setSaving(true);
    try { await addBlock(token, workspaceId, { entity_id: entityId, type: "text", content: { text: "" } }); }
    finally { setSaving(false); }
  };

  const togglePanel = (panel: Panel) => setActivePanel(activePanel === panel ? null : panel);

  const handleFormat = (format: string) => {
    if (!token) return;
    if (blockTypes.includes(format as BlockType)) {
      const id = selectedBlockId || blocks[blocks.length - 1]?.id;
      if (id) updateBlock(token, workspaceId, id, { type: format as BlockType });
    } else setActiveFormats((p) => p.includes(format) ? p.filter((f) => f !== format) : [...p, format]);
  };

  if (loading) {
    return (
      <div className="flex">
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
          <div className="flex gap-1 rounded-lg bg-card p-1">
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
      className={danger ? "text-muted hover:text-red-400" : "text-muted hover:text-foreground"}>
      {actionLoading === loadingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </Button>
  );

  return (
    <div className="flex">
        <div className="flex-1 p-6 space-y-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted">
          <Link href={`/workspace/${workspaceId}`} className="hover:text-foreground transition-colors">Workspace</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground truncate max-w-[240px]">{entity?.name || "Untitled"}</span>
        </nav>

        <EntityHeader token={token} workspaceId={workspaceId} entityId={entityId} entity={entity} onEntityChange={setEntity} onCreateEntity={async (name) => {
          if (creatingRef.current) return;
          creatingRef.current = true;
          try {
            const res = await apiClient.post<{ data: Entity }>(`/workspaces/${workspaceId}/entities/`, {
              workspace_id: workspaceId,
              ...(defaultEntityTypeId ? { entity_type_id: defaultEntityTypeId } : {}),
              name,
            });
            router.replace(`/workspace/${workspaceId}/entity/${res.data.id}`);
          } catch {
            toast.error("Failed to create entity");
            creatingRef.current = false;
          }
        }} />

        <div className="flex items-center gap-1 flex-wrap">
          {actionBtn(entity?.published ? "Unpublish" : "Publish", <Globe className="h-4 w-4" />, handlePublish, "publish")}
          {actionBtn("Archive", <Archive className="h-4 w-4" />, handleArchive, "archive")}
          {actionBtn("Delete", <Trash2 className="h-4 w-4" />, () => setShowDeleteConfirm(true), undefined, true)}
          <div className="h-5 w-px bg-surface mx-1" />
          {actionBtn("Share", <Share2 className="h-4 w-4" />, handleShare)}
          {actionBtn("Export", <Download className="h-4 w-4" />, handleExport, "export")}
        </div>

        <PanelTabs activePanel={activePanel} onTogglePanel={togglePanel} />
        <AIQuickActions token={token} workspaceId={workspaceId} entityId={entityId} />
        <EditorToolbar onFormat={handleFormat} activeFormats={activeFormats} />
        <BlockEditor blocks={blocks} token={token} onUpdateBlock={(t, id, d) => debouncedUpdateBlock(t, workspaceId, id, d)} onDeleteBlock={(t, id) => deleteBlock(t, workspaceId, id)}
          onAddBlock={handleAddBlock} onBlockSelect={setSelectedBlockId} readOnly={!token} />
      </div>

      {activePanel && (
        <div className="w-80 shrink-0 border-l border-border bg-background p-4 space-y-4 overflow-y-auto h-[calc(100vh-3.5rem)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground capitalize display-heading">{panelTitle}</h3>
            <button onClick={() => setActivePanel(null)} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          {activePanel === "tags" && <TagsPanel token={token} workspaceId={workspaceId} entityId={entityId} />}
          {activePanel === "relations" && <RelationsPanel token={token} entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "comments" && <CommentsPanel token={token} entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "children" && <ChildrenPanel token={token} entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "activity" && <ActivityPanel token={token} workspaceId={workspaceId} entityId={entityId} />}
          {activePanel === "ai" && <div className="h-full"><AIPanel workspaceId={workspaceId} entityId={entityId} entityTitle={entity?.name || "Untitled"} /></div>}
          {activePanel === "backlinks" && <BacklinksPanel entityId={entityId} workspaceId={workspaceId} />}
          {activePanel === "properties" && <PropertiesPanel workspaceId={workspaceId} entityId={entityId} />}
          {activePanel === "history" && <HistoryPanel workspaceId={workspaceId} entityId={entityId} />}
        </div>
      )}

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        title="Delete entity" description="This action cannot be undone. The entity and all its content will be permanently deleted."
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}
