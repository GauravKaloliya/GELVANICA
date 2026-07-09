'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface SchemaTreeProps {
  data: unknown;
  depth?: number;
  keyName?: string;
}

function formatValue(val: unknown): string {
  if (typeof val === 'string') return `"${val.length > 40 ? val.slice(0, 40) + '...' : val}"`;
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  return String(val);
}

function getType(val: unknown): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return `array[${val.length}]`;
  return typeof val;
}

export default function SchemaTree({ data, depth = 0, keyName }: SchemaTreeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (data === null || data === undefined || typeof data !== 'object') {
    return (
      <div className="flex items-start gap-2 font-mono text-[11px] leading-relaxed" style={{ paddingLeft: depth * 16 }}>
        {keyName && (
          <>
            <span className="text-[var(--foreground)] font-semibold">{keyName}:</span>{' '}
          </>
        )}
        <span className="text-[var(--muted)]">{formatValue(data)}</span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [String(i), v] as const) : Object.entries(data as Record<string, unknown>);
  const open = !collapsed;

  return (
    <div style={{ paddingLeft: depth * 16 }} className="font-mono text-[11px] leading-relaxed">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 hover:bg-[var(--border)] cursor-pointer text-[var(--muted)]"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {keyName && <span className="text-[var(--foreground)] font-semibold">{keyName}:</span>}
        <span className="text-[var(--muted)]">
          {isArray ? `[${data.length}]` : `{${Object.keys(data as Record<string, unknown>).length}}`}
        </span>
        {collapsed && (
          <span className="text-[var(--muted)] opacity-50 text-[10px] truncate max-w-[200px]">
            {isArray
              ? data.map((v: unknown) => getType(v)).join(', ')
              : Object.keys(data as Record<string, unknown>).join(', ')}
          </span>
        )}
      </div>
      {open && (
        <div className="border-l-2 border-[var(--border)] ml-[7px] pl-3 mt-0.5 space-y-0.5">
          {entries.map(([k, v]) => (
            <SchemaTree key={k} data={v} depth={0} keyName={k} />
          ))}
        </div>
      )}
    </div>
  );
}
