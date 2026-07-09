'use client';

import { useState } from 'react';
import { Play, X, Check, Loader } from 'lucide-react';
import { Endpoint } from '@/data';

interface ApiPlaygroundProps {
  endpoint: Endpoint;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + (process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1');

export default function ApiPlayground({ endpoint }: ApiPlaygroundProps) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState(endpoint.requestBody || '');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = new URL(endpoint.path, API_BASE);

      // Build query params (from endpoint.parameters where in=query or from params state)
      if (endpoint.parameters) {
        endpoint.parameters.forEach((p) => {
          const val = params[p.name] || '';
          if (val) url.searchParams.set(p.name, val);
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!endpoint.id.startsWith('auth')) {
        headers['Authorization'] = 'Bearer $ACCESS_TOKEN';
      }

      const fetchOpts: RequestInit = { method: endpoint.method, headers };

      let parsedBody: unknown = undefined;
      if (body.trim()) {
        try {
          parsedBody = JSON.parse(body);
          fetchOpts.body = JSON.stringify(parsedBody);
        } catch {
          fetchOpts.body = body;
        }
      }

      const start = performance.now();
      const res = await fetch(url.toString(), fetchOpts);
      const elapsed = (performance.now() - start).toFixed(0);

      let resBody: string;
      try {
        const json = await res.json();
        resBody = JSON.stringify(json, null, 2);
      } catch {
        resBody = await res.text();
      }

      setResponse(`// ${res.status} ${res.statusText} (${elapsed}ms)\n${resBody}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-black font-mono uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] cursor-pointer hover:bg-[var(--card-bg)]"
        aria-label="Open API playground"
      >
        <Play className="h-3 w-3" /> Try It
      </button>
    );
  }

  return (
    <div className="border-2 border-[var(--foreground)] bg-[var(--card-bg)] p-4 mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest font-mono text-[var(--foreground)]">
          <Play className="h-3 w-3 inline mr-1.5" /> API Playground — {endpoint.method} {endpoint.path}
        </h4>
        <button
          onClick={() => { setOpen(false); setResponse(null); setError(null); }}
          className="p-1 cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Close playground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Param inputs */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {endpoint.parameters.map((p) => (
            <div key={p.name} className="flex flex-col gap-0.5">
              <label className="text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">
                {p.name} {p.required && <span className="text-[var(--foreground)]">*</span>}
              </label>
              <input
                value={params[p.name] || ''}
                onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                placeholder={p.type}
                className="border border-[var(--border)] bg-[var(--code-bg)] px-2 py-1 text-[11px] font-mono text-[var(--foreground)] outline-none focus:border-[var(--foreground)]"
              />
            </div>
          ))}
        </div>
      )}

      {/* Body editor */}
      {endpoint.requestBody && (
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">Request Body (JSON)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="border border-[var(--border)] bg-[var(--code-bg)] px-2 py-1 text-[11px] font-mono text-[var(--foreground)] outline-none focus:border-[var(--foreground)] resize-y font-mono"
          />
        </div>
      )}

      {/* Send */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={loading}
          className="text-[10px] font-black font-mono uppercase tracking-widest px-4 py-2 border-2 border-[var(--foreground)] neo-depth-btn text-[var(--foreground)] cursor-pointer disabled:opacity-50 hover:bg-[var(--card-bg)] flex items-center gap-2"
        >
          {loading ? <Loader className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {loading ? 'Sending...' : 'Send Request'}
        </button>
      </div>

      {/* Response */}
      {error && (
        <div className="border border-rose-500/30 bg-rose-500/5 p-3 text-[11px] font-mono text-rose-400">
          {error}
        </div>
      )}
      {response && (
        <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
            <span className="text-[10px] font-mono text-[var(--muted)] font-bold uppercase">Response</span>
            <button
              onClick={() => navigator.clipboard.writeText(response)}
              className="p-1 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Copy response"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
          <pre className="p-3 font-mono text-[11px] text-[var(--foreground)] overflow-x-auto max-h-[200px] leading-relaxed">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
}
