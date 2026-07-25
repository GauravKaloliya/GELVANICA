"use client";

import { useState, useRef } from "react";
import { Upload, FileJson, Loader2, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { backupService } from "@/lib/services/backupService";
import { useAuthStore } from "@/stores/authStore";

interface ImportResult {
  imported: Record<string, number>;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onImportComplete?: () => void;
}

export function ImportModal({ open, onClose, workspaceId, onImportComplete }: ImportModalProps) {
  const { tokens } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!tokens?.access_token || !file) return;
    setLoading(true);
    setError(null);
    try {
      const json = await backupService.importBackup(workspaceId, file);
      setResult(json.data);
      setTimeout(() => {
        onImportComplete?.();
        onClose();
      }, 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <Upload className="h-5 w-5 text-green-400" />
            </div>
            <DialogTitle>Import Data</DialogTitle>
          </div>
        </DialogHeader>

        {result ? (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              <p className="text-sm font-medium text-green-400">Import complete!</p>
            </div>
            <div className="mt-2 space-y-1 text-xs text-zinc-400">
              {Object.entries(result.imported).map(([key, count]) => (
                <p key={key}>
                  <Badge variant="outline" size="sm" className="mr-1">{key}</Badge>
                  {count}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-lg border-2 border-dashed border-zinc-700 p-8 text-center hover:border-zinc-500 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileJson className="h-8 w-8 text-green-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-zinc-600" />
                  <p className="mt-2 text-sm text-zinc-400">Click to select a JSON file</p>
                  <p className="mt-1 text-xs text-zinc-600">Accepts .json export files</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !file || !!result}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
