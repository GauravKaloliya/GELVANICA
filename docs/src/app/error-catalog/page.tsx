'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Search, X, ArrowUpDown, Copy, Check, ExternalLink, Shield, Bug, Server, Database, Workflow } from 'lucide-react';
import PageWrapper from '@/components/PageWrapper';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ERROR_CODES, ErrorCode } from '@/data';

const MODULE_ICONS: Record<string, typeof Shield> = {
  General: Server,
  Auth: Shield,
  Entities: Database,
  Versions: Workflow,
  Workspaces: Database,
  Graph: Bug,
  AI: Bug,
  Sync: Workflow,
};

export default function ErrorCatalogPage() {
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const modules = useMemo(() => [...new Set(ERROR_CODES.map((e) => e.module))].sort(), []);
  const statusCodes = useMemo(() => [...new Set(ERROR_CODES.map((e) => e.httpStatus))].sort((a, b) => a - b), []);

  const filtered = useMemo(() => {
    let result = [...ERROR_CODES];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.code.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.module.toLowerCase().includes(q)
      );
    }
    if (filterModule) result = result.filter((e) => e.module === filterModule);
    if (filterStatus) result = result.filter((e) => e.httpStatus === filterStatus);
    return result;
  }, [search, filterModule, filterStatus]);

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const clearFilters = () => {
    setSearch('');
    setFilterModule(null);
    setFilterStatus(null);
  };

  const hasFilters = search || filterModule || filterStatus;

  return (
    <ErrorBoundary>
      <PageWrapper>
        <div className="space-y-8">
          {/* Header */}
          <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] neo-depth flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-[10px] font-black tracking-widest uppercase font-mono neo-depth-btn">
                <AlertTriangle className="h-3.5 w-3.5" /> ERROR CATALOG
              </div>
              <h1 className="display-heading text-2xl sm:text-3xl tracking-tight text-[var(--foreground)] uppercase">
                API Error Reference
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed font-mono font-bold max-w-2xl">
                Complete reference of all API error codes, their causes, HTTP status codes, and recommended resolutions.
                Every error response follows a consistent JSON format with <code className="bg-[var(--code-bg)] px-1.5 py-0.5 border border-[var(--border)]">code</code>, 
                <code className="bg-[var(--code-bg)] px-1.5 py-0.5 border border-[var(--border)]">message</code>, and optional <code className="bg-[var(--code-bg)] px-1.5 py-0.5 border border-[var(--border)]">details</code> fields.
              </p>
              <div className="text-[10px] font-mono text-[var(--muted)] font-bold">
                {ERROR_CODES.length} error codes · {statusCodes.length} HTTP status codes · {modules.length} modules
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-2 border-[var(--border)] bg-[var(--card-bg)]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, title, module..."
                className="w-full border-2 border-[var(--border)] bg-[var(--code-bg)] pl-9 pr-3 py-1.5 text-[11px] font-mono text-[var(--foreground)] outline-none focus:border-[var(--foreground)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <select
              value={filterModule || ''}
              onChange={(e) => setFilterModule(e.target.value || null)}
              className="text-[10px] font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-none cursor-pointer"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>

            <select
              value={filterStatus || ''}
              onChange={(e) => setFilterStatus(e.target.value ? Number(e.target.value) : null)}
              className="text-[10px] font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-none cursor-pointer"
            >
              <option value="">All Status Codes</option>
              {statusCodes.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>

            {hasFilters && (
              <button onClick={clearFilters} className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}

            <span className="text-[10px] font-mono text-[var(--muted)] ml-auto">{filtered.length} / {ERROR_CODES.length}</span>
          </div>

          {/* Error Code Cards */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-[var(--border)] p-8">
              <AlertTriangle className="h-12 w-12 mb-4 text-[var(--muted)]" strokeWidth={1.5} />
              <h3 className="display-heading text-sm text-[var(--muted)] uppercase tracking-wider">No matching error codes</h3>
              <button onClick={clearFilters} className="mt-4 text-xs font-mono font-bold neo-depth-btn px-4 py-2 border-2 border-[var(--foreground)] text-[var(--foreground)] cursor-pointer">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((error) => {
                const isExpanded = expandedId === error.code;
                const Icon = MODULE_ICONS[error.module] || Shield;

                return (
                  <motion.section
                    key={error.code}
                    layout
                    className={`border-2 transition-all duration-200 cursor-pointer ${
                      isExpanded
                        ? 'border-[var(--foreground)] neo-depth'
                        : 'border-[var(--border)] hover:border-[var(--border)] opacity-80 hover:opacity-100'
                    }`}
                    onClick={() => toggleExpand(error.code)}
                  >
                    {/* Header */}
                    <div className="p-5 flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className={`w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center shrink-0 ${
                          error.httpStatus >= 500 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          error.httpStatus >= 400 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        }`}>
                          <Icon className="h-5 w-5" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5 mb-1">
                            <span className="text-sm font-black font-mono text-[var(--foreground)] tracking-tight">{error.code}</span>
                            {(() => {
                              const cls = error.httpStatus >= 500 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                error.httpStatus >= 400 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-sky-500/10 text-sky-400 border-sky-500/30';
                              return (
                                <span className={`text-[10px] font-black px-2 py-0.5 border font-mono ${cls}`}>
                                  {error.httpStatus}
                                </span>
                              );
                            })()}
                            <span className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider">{error.module}</span>
                          </div>
                          <h3 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight">{error.title}</h3>
                          <p className="text-xs text-[var(--muted)] font-mono mt-1 leading-relaxed">{error.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t-2 border-[var(--border)] px-5 pb-5"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                          {/* Causes */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] font-mono flex items-center gap-1.5">
                              <Bug className="h-3 w-3" /> Common Causes
                            </h4>
                            <ul className="space-y-1.5">
                              {error.causes.map((cause, i) => (
                                <li key={i} className="flex items-start gap-2 text-[11px] font-mono text-[var(--muted)]">
                                  <span className="text-[var(--foreground)] mt-0.5 shrink-0">▸</span>
                                  <span>{cause}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Resolution */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] font-mono flex items-center gap-1.5">
                              <Workflow className="h-3 w-3" /> Resolution
                            </h4>
                            <p className="text-[11px] font-mono text-[var(--muted)] leading-relaxed">{error.resolution}</p>
                          </div>

                          {/* Example */}
                          {error.example && (
                            <div className="lg:col-span-2 space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] font-mono">Example Response</h4>
                              <div className="relative border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(error.example || ''); setCopiedId(error.code); setTimeout(() => setCopiedId(null), 2000); }}
                                  className="absolute right-2 top-2 p-1.5 border border-[var(--border)] neo-depth-btn bg-[var(--card-bg)] cursor-pointer z-10"
                                  aria-label="Copy example"
                                >
                                  {copiedId === error.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                                <pre className="p-4 font-mono text-[11px] overflow-x-auto leading-relaxed m-0 text-[var(--foreground)]">{error.example}</pre>
                              </div>
                            </div>
                          )}

                          {/* Related errors in same module */}
                          <div className="lg:col-span-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] font-mono mb-2">Related Errors ({error.module})</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {ERROR_CODES.filter((e) => e.module === error.module && e.code !== error.code).map((related) => (
                                <button
                                  key={related.code}
                                  onClick={(e) => { e.stopPropagation(); setExpandedId(related.code); document.getElementById(`error-${related.code}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                                  className="text-[10px] font-mono font-bold px-2 py-0.5 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] cursor-pointer transition-colors"
                                >
                                  {related.httpStatus} {related.code}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.section>
                );
              })}
            </div>
          )}

          {/* HTTP Status Reference */}
          <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6">
            <h2 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight mb-4 flex items-center gap-2">
              <Server className="h-4 w-4" /> HTTP Status Code Reference
            </h2>
            <div className="overflow-x-auto border-2 border-[var(--border)]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                    <th className="p-3">Status</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Common Scenarios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                  {[
                    { status: '400', label: 'Bad Request', desc: 'Malformed syntax or invalid parameters', scenarios: 'Missing fields, invalid JSON, type mismatches' },
                    { status: '401', label: 'Unauthorized', desc: 'Authentication missing or invalid', scenarios: 'Expired token, missing header, bad credentials' },
                    { status: '403', label: 'Forbidden', desc: 'Insufficient permissions for resource', scenarios: 'Wrong role, workspace not accessible' },
                    { status: '404', label: 'Not Found', desc: 'Resource does not exist', scenarios: 'Bad UUID, deleted resource, wrong workspace' },
                    { status: '408', label: 'Request Timeout', desc: 'Operation exceeded time limit', scenarios: 'Graph query timeout, large traversal' },
                    { status: '409', label: 'Conflict', desc: 'Resource state conflict', scenarios: 'Duplicate title, merge conflict, version mismatch' },
                    { status: '429', label: 'Too Many Requests', desc: 'Rate limit exceeded', scenarios: 'API quota exhausted, burst limit hit' },
                    { status: '500', label: 'Internal Error', desc: 'Unexpected server error', scenarios: 'DB failure, unhandled exception, AI model error' },
                    { status: '503', label: 'Service Unavailable', desc: 'Temporary service outage', scenarios: 'Maintenance, scaling event, deployment' },
                  ].map(({ status, label, desc, scenarios }) => (
                    <tr key={status} className="hover:bg-[var(--card-bg)]">
                      <td className="p-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 border font-mono ${
                          Number(status) >= 500 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          Number(status) >= 400 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        }`}>{status}</span>
                      </td>
                      <td className="p-3 font-semibold text-[var(--foreground)]">{label}</td>
                      <td className="p-3">{desc}</td>
                      <td className="p-3 text-[var(--muted)]">{scenarios}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <Footer />
      </PageWrapper>
    </ErrorBoundary>
  );
}
