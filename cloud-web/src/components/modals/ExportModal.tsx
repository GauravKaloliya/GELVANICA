"use client";

import { useState, useEffect } from "react";
import { Download, FileJson, FileText, Archive, Globe, FileIcon, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { configService } from "@/lib/services/configService";
import type { ExportFormat as ConfigExportFormat } from "@/lib/services/configService";
import { backupService } from "@/lib/services/backupService";
import { downloadJson } from "@/lib/utils";


type ExportFormat = "json" | "markdown" | "zip" | "html" | "pdf" | "disk";

const EXPORT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  json: { icon: FileJson, color: "text-blue-400" },
  markdown: { icon: FileText, color: "text-green-400" },
  zip: { icon: Archive, color: "text-purple-400" },
  disk: { icon: FileIcon, color: "text-amber-400" },
  html: { icon: Globe, color: "text-cyan-400" },
  pdf: { icon: FileText, color: "text-red-400" },
};

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  entityId?: string;
  entityTitle?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportModal({ open, onClose, workspaceId, workspaceName, entityId, entityTitle }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [formatOptions, setFormatOptions] = useState<ConfigExportFormat[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    configService.get(workspaceId).then(c => setFormatOptions(c.export_formats ?? [])).catch(() => {});
  }, [workspaceId]);

  const selectedFormatData = formatOptions.find((f) => f.id === format);
  const needsEntity = selectedFormatData?.scope === "entity";
  const canExport = !needsEntity || (entityId && entityTitle);

  const slug = workspaceName.replace(/\s+/g, "-").toLowerCase();

  const handleExport = async () => {
    setLoading(true);
    try {
      switch (format) {
        case "json": {
          const data = await backupService.exportJson(workspaceId);
          downloadJson(data, `${slug}-export.json`);
          break;
        }
        case "markdown": {
          const blob = await apiClient.blob(`/workspaces/${workspaceId}/backups/export-markdown`, { workspace_id: workspaceId });
          downloadBlob(blob, `${slug}-export.tar.gz`);
          break;
        }
        case "zip": {
          const blob = await apiClient.blob(`/workspaces/${workspaceId}/backups/export-zip`, { workspace_id: workspaceId });
          downloadBlob(blob, `${slug}-export.zip`);
          break;
        }
        case "disk": {
          await apiClient.post(`/workspaces/${workspaceId}/backups/export-to-disk`, { workspace_id: workspaceId });
          break;
        }
        case "html": {
          if (!entityId) throw new Error("No entity selected");
          const blob = await apiClient.blob(`/workspaces/${workspaceId}/backups/export-html`, { workspace_id: workspaceId, entity_id: entityId });
          const entitySlug = (entityTitle || "entity").replace(/\s+/g, "-").toLowerCase();
          downloadBlob(blob, `${entitySlug}.html`);
          break;
        }
        case "pdf": {
          if (!entityId) throw new Error("No entity selected");
          const blob = await apiClient.blob(`/workspaces/${workspaceId}/backups/export-pdf`, { workspace_id: workspaceId, entity_id: entityId });
          const entitySlug = (entityTitle || "entity").replace(/\s+/g, "-").toLowerCase();
          downloadBlob(blob, `${entitySlug}.pdf`);
          break;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Download className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle>Export Workspace</DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-step-3 text-muted">
          Download data from <span className="font-medium text-foreground">{workspaceName}</span>
        </p>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-1.5">
            {formatOptions.map((opt) => {
              const iconData = EXPORT_ICONS[opt.id] || EXPORT_ICONS.json;
              const Icon = iconData.icon;
              const disabled = opt.scope === "entity" && !entityId;
              return (
                <button
                  key={opt.id}
                  onClick={() => setFormat(opt.id)}
                  disabled={disabled}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                    disabled && "opacity-40 cursor-not-allowed",
                    format === opt.id
                      ? "border-blue-500/50 bg-blue-500/5 text-white"
                      : "border-border text-muted card-hover"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", iconData.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{opt.label}</p>
                      {opt.scope === "entity" && (
                        <span className="text-step-0 font-medium uppercase text-muted">Entity only</span>
                      )}
                    </div>
                    <p className="text-step-1 text-muted">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {needsEntity && !entityId && (
          <p className="text-step-1 text-amber-400">Select an entity first to use this export format.</p>
        )}

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || !canExport}
            className={cn(success && "bg-green-600 hover:bg-green-700")}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : success ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {success ? "Exported!" : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
