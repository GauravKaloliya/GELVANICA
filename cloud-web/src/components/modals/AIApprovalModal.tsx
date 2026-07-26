"use client";

import { useState } from "react";
import { Brain, Check, XIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Separator } from "@/components/ui/Separator";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

interface AISuggestion {
  id: string;
  type: "merge" | "relation" | "tag" | "stale" | "content";
  title: string;
  description: string;
  confidence: number;
  entityIds: string[];
}

interface AIApprovalModalProps {
  open: boolean;
  onClose: () => void;
  suggestions: AISuggestion[];
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  loading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  merge: "Merge Candidates",
  relation: "Suggested Relations",
  tag: "Suggested Tags",
  stale: "Stale Content",
  content: "Content Suggestion",
};

const TYPE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  merge: "default",
  relation: "secondary",
  tag: "outline",
  stale: "destructive",
  content: "default",
};

export function AIApprovalModal({
  open,
  onClose,
  suggestions,
  onApprove,
  onDismiss,
  loading = false,
}: AIApprovalModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  const grouped = suggestions.reduce(
    (acc, s) => {
      if (!acc[s.type]) acc[s.type] = [];
      acc[s.type].push(s);
      return acc;
    },
    {} as Record<string, AISuggestion[]>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
              <Brain className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <DialogTitle>AI Suggestions</DialogTitle>
              <p className="text-xs text-muted">{suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} to review</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-12 text-center">
              <Brain className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-2 text-sm text-muted">No suggestions at this time</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    {TYPE_LABELS[type] || type}
                  </h4>
                  <div className="space-y-2">
                    {items.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={cn(
                          "rounded-lg border p-4 transition-colors",
                          suggestion.id === processingId
                            ? "border-indigo-500/30 bg-indigo-500/5"
                            : "border-border bg-surface card-hover"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{suggestion.title}</p>
                              <Badge variant={TYPE_BADGE_VARIANTS[type] || "default"} size="sm">
                                {type}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted">{suggestion.description}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Progress
                                value={suggestion.confidence * 100}
                                className="h-1.5 w-16"
                              />
                              <span className="text-xs text-muted">
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleApprove(suggestion.id)}
                              disabled={processingId === suggestion.id}
                              className="h-8 w-8 text-green-400 hover:bg-green-500/10 hover:text-green-400"
                              aria-label="Approve suggestion"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onDismiss(suggestion.id)}
                              className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                              aria-label="Dismiss suggestion"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator className="my-2" />

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
