'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, GitBranch, AlertTriangle, Code2, BookOpen, Layers, ChevronDown, ChevronRight, ArrowUpDown, FileJson, FileType } from 'lucide-react';
import PageWrapper from '@/components/PageWrapper';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { CHANGELOG, VERSIONING_POLICY, DEPRECATION_TIMELINE, API_ENDPOINT_COUNTS } from '@/data';

const VERSION_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  major: { bg: 'bg-[var(--foreground)]', text: 'text-[var(--background)]', label: 'MAJOR' },
  minor: { bg: 'bg-sky-500/20', text: 'text-sky-400', label: 'MINOR' },
  patch: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'PATCH' },
  deprecation: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'DEPRECATION' },
  beta: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'BETA' },
};

const CHANGE_CATEGORY_STYLES: Record<string, { label: string; bg: string }> = {
  Specification: { label: 'SPEC', bg: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  Reference: { label: 'REF', bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  Auth: { label: 'AUTH', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  Docs: { label: 'DOCS', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

const MODULE_TO_CATEGORY: Record<string, string> = {
  Specification: 'Specification',
  Reference: 'Reference',
  Auth: 'Auth',
  Docs: 'Docs',
};

const getCategoryStyle = (module: string) => {
  const cat = MODULE_TO_CATEGORY[module] || 'Docs';
  return CHANGE_CATEGORY_STYLES[cat] || CHANGE_CATEGORY_STYLES.Docs;
};

export default function ChangelogPage() {
  const [expandedVersion, setExpandedVersion] = useState<string>(CHANGELOG[0].version);
  const [showAllVersions, setShowAllVersions] = useState(false);

  const toggleVersion = (version: string) => {
    setExpandedVersion(expandedVersion === version ? '' : version);
  };

  const displayedEntries = showAllVersions ? CHANGELOG : CHANGELOG.slice(0, 3);

  return (
    <ErrorBoundary>
      <PageWrapper>
        <div className="space-y-8">
          {/* Header */}
          <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] neo-depth flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-[10px] font-black tracking-widest uppercase font-mono neo-depth-btn">
                <GitBranch className="h-3.5 w-3.5" /> API VERSIONING
              </div>
              <h1 className="display-heading text-2xl sm:text-3xl tracking-tight text-[var(--foreground)] uppercase">
                API Changelog & Version Reference
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed font-mono font-bold max-w-2xl">
                Complete version history for the Gnovium API. Every release documents endpoint changes,
                specification updates, breaking changes, deprecation notices, and migration paths.
                We follow semantic versioning with a minimum 6-month deprecation window.
              </p>
              <div className="flex flex-wrap gap-3 pt-2 font-mono text-[10px] font-bold">
                <span className="px-2.5 py-1 border-2 border-[var(--border)] text-[var(--muted)] bg-[var(--card-bg)]">
                  Current: {VERSIONING_POLICY.current}
                </span>
                <span className="px-2.5 py-1 border-2 border-[var(--border)] text-[var(--muted)] bg-[var(--card-bg)]">
                  Next: {VERSIONING_POLICY.next}
                </span>
                <span className="px-2.5 py-1 border-2 border-[var(--border)] text-[var(--muted)] bg-[var(--card-bg)]">
                  Supported: {VERSIONING_POLICY.supportedVersions.join(', ')}
                </span>
                <span className="px-2.5 py-1 border-2 border-[var(--border)] text-[var(--muted)] bg-[var(--card-bg)]">
                  Endpoints: {API_ENDPOINT_COUNTS[VERSIONING_POLICY.current]?.endpoints || 111}
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <a
                href="/openapi.json"
                download
                className="text-[10px] font-black font-mono uppercase tracking-wider px-4 py-2 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5"
              >
                <FileJson className="h-3 w-3" /> OpenAPI JSON
              </a>
              <a
                href="/openapi.yaml"
                download
                className="text-[10px] font-black font-mono uppercase tracking-wider px-4 py-2 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5"
              >
                <FileType className="h-3 w-3" /> OpenAPI YAML
              </a>
            </div>
          </div>

          {/* API Version Overview */}
          <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6">
            <h2 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4" /> API Version Coverage
            </h2>
            <p className="text-[11px] font-mono text-[var(--muted)] mb-4 leading-relaxed">
              Endpoint and module count across all API versions. Patch versions within the same minor version
              share the same API contract — only documentation and reference material changes.
            </p>
            <div className="overflow-x-auto border-2 border-[var(--border)]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                    <th className="p-3">Version</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Endpoints</th>
                    <th className="p-3">Modules</th>
                    <th className="p-3">Paths</th>
                    <th className="p-3">Breaking</th>
                    <th className="p-3">Release</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                  {CHANGELOG.filter(e => API_ENDPOINT_COUNTS[e.version]).map((entry) => {
                    const counts = API_ENDPOINT_COUNTS[entry.version];
                    const style = VERSION_TYPE_STYLES[entry.type] || VERSION_TYPE_STYLES.patch;
                    return (
                      <tr key={entry.version} className="hover:bg-[var(--card-bg)]">
                        <td className="p-3 font-bold text-[var(--foreground)]">{entry.version}</td>
                        <td className="p-3">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 border font-mono ${style.bg} ${style.text} border-[var(--border)]`}>
                            {style.label}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">{counts.endpoints}</td>
                        <td className="p-3">{counts.modules}</td>
                        <td className="p-3">{counts.paths}</td>
                        <td className="p-3">
                          {entry.breaking ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">YES</span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="p-3">{entry.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Versioning Policy */}
          <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6">
            <h2 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Versioning Policy
            </h2>
            <div className="prose prose-sm max-w-none">
              {VERSIONING_POLICY.policy.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return <h3 key={i} className="text-sm font-black font-mono text-[var(--foreground)] uppercase tracking-wider mt-4 mb-2">{line.replace('## ', '')}</h3>;
                }
                if (line.startsWith('- **')) {
                  const match = line.match(/- \*\*(.+?)\*\*(.+)/);
                  if (match) {
                    return (
                      <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-[var(--muted)] mb-2">
                        <span className="text-[var(--foreground)] font-bold shrink-0 mt-0.5">{match[1]}</span>
                        <span>{match[2]}</span>
                      </div>
                    );
                  }
                }
                if (line.startsWith('|')) {
                  return null;
                }
                if (line.trim()) {
                  return <p key={i} className="text-[11px] font-mono text-[var(--muted)] leading-relaxed mb-2">{line}</p>;
                }
                return null;
              })}

              <div className="overflow-x-auto border-2 border-[var(--border)] mt-4">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                      <th className="p-3">Version</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Release</th>
                      <th className="p-3">End of Life</th>
                      <th className="p-3">Endpoints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                    {[
                      { version: 'v1', status: 'Current', release: 'Jun 2026', eol: 'Dec 2027', endpoints: 111, current: true },
                      { version: 'v2', status: 'Planned', release: 'Q4 2026', eol: 'Jun 2029', endpoints: '~150', current: false },
                      { version: 'v3', status: 'Planned', release: 'Q2 2027', eol: 'TBD', endpoints: 'TBD', current: false },
                    ].map((row) => (
                      <tr key={row.version} className="hover:bg-[var(--card-bg)]">
                        <td className="p-3 font-bold text-[var(--foreground)]">{row.version}</td>
                        <td className="p-3">
                          {row.current ? (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">{row.status}</span>
                          ) : (
                            <span className="text-[10px] font-mono text-[var(--muted)]">{row.status}</span>
                          )}
                        </td>
                        <td className="p-3">{row.release}</td>
                        <td className="p-3">{row.eol}</td>
                        <td className="p-3 font-semibold">{row.endpoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Deprecation Timeline */}
          <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6">
            <h2 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Deprecation Timeline
            </h2>
            <div className="overflow-x-auto border-2 border-[var(--border)]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                    <th className="p-3">Feature</th>
                    <th className="p-3">Deprecated In</th>
                    <th className="p-3">Removal In</th>
                    <th className="p-3">Migration Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                  {DEPRECATION_TIMELINE.map((item, i) => (
                    <tr key={i} className="hover:bg-[var(--card-bg)]">
                      <td className="p-3 font-semibold text-[var(--foreground)]">{item.feature}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">{item.deprecatedIn}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">{item.removalIn}</span>
                      </td>
                      <td className="p-3 text-[var(--muted)] text-[11px]">{item.migration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Changelog Entries */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight flex items-center gap-2">
                <Clock className="h-4 w-4" /> Release History
              </h2>
              {CHANGELOG.length > 3 && (
                <button
                  onClick={() => setShowAllVersions(!showAllVersions)}
                  className="text-[10px] font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {showAllVersions ? 'Show Latest' : `Show All (${CHANGELOG.length})`}
                </button>
              )}
            </div>

            {displayedEntries.map((entry) => {
              const isExpanded = expandedVersion === entry.version;
              const style = VERSION_TYPE_STYLES[entry.type] || VERSION_TYPE_STYLES.patch;
              const counts = API_ENDPOINT_COUNTS[entry.version];

              return (
                <div key={entry.version} className="border-2 border-[var(--border)] bg-[var(--card-bg)]">
                  <button
                    onClick={() => toggleVersion(entry.version)}
                    className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer text-left"
                  >
                    <div className={`w-12 h-12 border-2 border-[var(--border)] flex items-center justify-center shrink-0 ${style.bg}`}>
                      <Code2 className={`h-5 w-5 ${style.text}`} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 border font-mono ${style.bg} ${style.text} border-[var(--border)]`}>
                          {style.label}
                        </span>
                        <span className="text-base font-black font-mono text-[var(--foreground)]">{entry.version}</span>
                        <span className="text-[10px] font-mono text-[var(--muted)]">{entry.date}</span>
                        {entry.breaking && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> BREAKING
                          </span>
                        )}
                        {counts && (
                          <span className="text-[9px] font-mono text-[var(--muted)] px-1.5 py-0.5 border border-[var(--border)]">
                            {counts.endpoints} EP / {counts.modules} MOD
                          </span>
                        )}
                      </div>
                      <h3 className="display-heading text-sm text-[var(--foreground)] mt-1">{entry.title}</h3>
                      <p className="text-[11px] font-mono text-[var(--muted)] mt-0.5">{entry.description}</p>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-[var(--muted)] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)] shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t-2 border-[var(--border)] overflow-hidden"
                      >
                        <div className="p-5 space-y-1">
                          {entry.changes.map((change, i) => {
                            const catStyle = getCategoryStyle(change.module || '');
                            return (
                              <div key={i} className="flex items-start gap-3 py-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-widest font-mono w-14 shrink-0 pt-0.5 border px-1 py-0.5 text-center ${catStyle.label ? catStyle.bg : 'text-[var(--muted)] border-[var(--border)]'}`}>
                                  {change.module ? (CHANGE_CATEGORY_STYLES[MODULE_TO_CATEGORY[change.module]]?.label || change.module.substring(0, 4).toUpperCase()) : 'GEN'}
                                </span>
                                <p className="text-[11px] font-mono text-[var(--muted)] leading-relaxed">{change.description}</p>
                                <span className={`text-[9px] font-black uppercase tracking-widest font-mono w-16 shrink-0 pt-0.5 text-right ${
                                  change.type === 'added' ? 'text-emerald-400' :
                                  change.type === 'changed' ? 'text-sky-400' :
                                  change.type === 'deprecated' ? 'text-amber-400' :
                                  change.type === 'fixed' ? 'text-purple-400' :
                                  'text-[var(--muted)]'
                                }`}>{change.type}</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
        <Footer />
      </PageWrapper>
    </ErrorBoundary>
  );
}
