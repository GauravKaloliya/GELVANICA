import {
  Shield, Key, Layers, Box, Tag, FileText, GitBranch,
  Search, Brain, Share2, RefreshCw, Activity, ShieldCheck,
  Bell, Play, LayoutDashboard, Archive, MessageSquare,
  Image, Workflow, Globe, Database, Terminal, Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

const MODULE_ICONS: Record<string, ReactNode> = {
  System: <Terminal className="h-3.5 w-3.5" />,
  Auth: <Shield className="h-3.5 w-3.5" />,
  Workspaces: <Layers className="h-3.5 w-3.5" />,
  Entities: <Box className="h-3.5 w-3.5" />,

  Tags: <Tag className="h-3.5 w-3.5" />,
  Blocks: <FileText className="h-3.5 w-3.5" />,
  Relations: <Share2 className="h-3.5 w-3.5" />,
  Comments: <MessageSquare className="h-3.5 w-3.5" />,
  Branches: <GitBranch className="h-3.5 w-3.5" />,
  Versions: <Database className="h-3.5 w-3.5" />,
  Diffs: <RefreshCw className="h-3.5 w-3.5" />,
  Search: <Search className="h-3.5 w-3.5" />,
  AI: <Brain className="h-3.5 w-3.5" />,
  Files: <Image className="h-3.5 w-3.5" />,
  Graph: <Share2 className="h-3.5 w-3.5" />,
  Sync: <RefreshCw className="h-3.5 w-3.5" />,
  Activity: <Activity className="h-3.5 w-3.5" />,
  Governance: <ShieldCheck className="h-3.5 w-3.5" />,
  Notifications: <Bell className="h-3.5 w-3.5" />,
  Jobs: <Play className="h-3.5 w-3.5" />,
  Dashboard: <LayoutDashboard className="h-3.5 w-3.5" />,
  Backups: <Archive className="h-3.5 w-3.5" />,
};

const MODULE_COLORS: Record<string, { light: string; dark: string; border: string }> = {
  System: { light: '#6366f1', dark: '#818cf8', border: '#6366f140' },
  Auth: { light: '#059669', dark: '#34d399', border: '#05966940' },
  Workspaces: { light: '#0284c7', dark: '#38bdf8', border: '#0284c740' },
  Entities: { light: '#d97706', dark: '#fbbf24', border: '#d9770640' },

  Tags: { light: '#14b8a6', dark: '#2dd4bf', border: '#14b8a640' },
  Blocks: { light: '#f97316', dark: '#fb923c', border: '#f9731640' },
  Relations: { light: '#0ea5e9', dark: '#38bdf8', border: '#0ea5e940' },
  Comments: { light: '#84cc16', dark: '#a3e635', border: '#84cc1640' },
  Branches: { light: '#e11d48', dark: '#fb7185', border: '#e11d4840' },
  Versions: { light: '#64748b', dark: '#94a3b8', border: '#64748b40' },
  Diffs: { light: '#7c3aed', dark: '#8b5cf6', border: '#7c3aed40' },
  Search: { light: '#0891b2', dark: '#22d3ee', border: '#0891b240' },
  AI: { light: '#2563eb', dark: '#60a5fa', border: '#2563eb40' },
  Files: { light: '#ca8a04', dark: '#eab308', border: '#ca8a0440' },
  Graph: { light: '#4f46e5', dark: '#6366f1', border: '#4f46e540' },
  Sync: { light: '#0d9488', dark: '#14b8a6', border: '#0d948840' },
  Activity: { light: '#9333ea', dark: '#a855f7', border: '#9333ea40' },
  Governance: { light: '#b91c1c', dark: '#ef4444', border: '#b91c1c40' },
  Notifications: { light: '#c026d3', dark: '#d946ef', border: '#c026d340' },
  Jobs: { light: '#1d4ed8', dark: '#3b82f6', border: '#1d4ed840' },
  Dashboard: { light: '#047857', dark: '#10b981', border: '#04785740' },
  Backups: { light: '#78716c', dark: '#a8a29e', border: '#78716c40' },
};

export function getModuleColor(moduleName: string): { light: string; dark: string; border: string } {
  return MODULE_COLORS[moduleName] || { light: '#09090b', dark: '#fafafa', border: '#09090b40' };
}

export function getModuleIcon(moduleName: string) {
  return MODULE_ICONS[moduleName] || <Box className="h-3.5 w-3.5" />;
}

export const ALL_MODULES = Object.keys(MODULE_ICONS);
