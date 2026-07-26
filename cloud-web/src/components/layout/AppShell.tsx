"use client";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { useUIStore } from "@/stores/uiStore";

export function AppShell({ workspaceId, children }: { workspaceId: string; children: React.ReactNode }) {
  const { rightPanelOpen } = useUIStore();
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar workspaceId={workspaceId} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopNav workspaceId={workspaceId} />
        <main className="flex-1 overflow-auto p-0">
          {children}
        </main>
      </div>
      {rightPanelOpen && <RightPanel />}
    </div>
  );
}
