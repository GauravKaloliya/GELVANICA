'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Search, ChevronDown, ChevronRight, Clock, Star, X, Copy, Check,
  ArrowLeft, Terminal, Code2, BookOpen, Play,
} from 'lucide-react';
import type { Endpoint } from '@/data';
import { getModuleIcon, getModuleColor } from '@/data/icons';

const ApiPlayground = dynamic(() => import('@/components/ApiPlayground'), { ssr: false });

interface MobileDocsProps {
  endpoints: Endpoint[];
  modules: Record<string, Endpoint[]>;
  recentlyViewed: string[];
  activeEndpointId: string;
  viewedEndpoints: Set<string>;
  pinnedEndpoints: Set<string>;
  onSelect: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  getSnippet: (ep: Endpoint, lang: 'curl' | 'js' | 'python' | 'typescript') => string;
  methodBadge: (method: string) => ReactNode;
  theme: string;
  activeTabs: Record<string, 'curl' | 'js' | 'python' | 'typescript'>;
  setActiveTabs: (tabs: Record<string, 'curl' | 'js' | 'python' | 'typescript'>) => void;
  onTogglePin: (id: string) => void;
}

export default function MobileDocs({
  endpoints, modules, recentlyViewed, activeEndpointId, viewedEndpoints,
  pinnedEndpoints, onSelect, onCopy, copiedId, getSnippet, methodBadge,
  theme, activeTabs, setActiveTabs, onTogglePin,
}: MobileDocsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'docs' | 'recent' | 'pinned'>('docs');

  const activeEndpoint = endpoints.find(ep => ep.id === activeEndpointId);

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery) return endpoints;
    const q = searchQuery.toLowerCase();
    return endpoints.filter(ep =>
      ep.path.toLowerCase().includes(q) ||
      ep.summary.toLowerCase().includes(q) ||
      ep.module.toLowerCase().includes(q)
    );
  }, [endpoints, searchQuery]);

  const groupedModules = useMemo(() => {
    const grouped: Record<string, Endpoint[]> = {};
    filteredEndpoints.forEach(ep => {
      if (!grouped[ep.module]) grouped[ep.module] = [];
      grouped[ep.module].push(ep);
    });
    return grouped;
  }, [filteredEndpoints]);

  const toggleModule = (name: string) => {
    setExpandedModule(prev => prev === name ? null : name);
  };

  const handleEndpointTap = (id: string) => {
    onSelect(id);
    setShowDetail(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(5);
  };

  const STATUS_CODES: Record<string, { code: string; description: string }[]> = {
    GET: [
      { code: '200', description: 'Success' },
      { code: '404', description: 'Not found' },
      { code: '400', description: 'Bad request' },
      { code: '401', description: 'Unauthorized' },
    ],
    POST: [
      { code: '201', description: 'Created' },
      { code: '400', description: 'Bad request' },
      { code: '401', description: 'Unauthorized' },
      { code: '409', description: 'Conflict' },
    ],
    PATCH: [
      { code: '200', description: 'Success' },
      { code: '404', description: 'Not found' },
      { code: '400', description: 'Bad request' },
      { code: '401', description: 'Unauthorized' },
      { code: '409', description: 'Conflict' },
    ],
    DELETE: [
      { code: '200', description: 'Deleted' },
      { code: '404', description: 'Not found' },
      { code: '400', description: 'Bad request' },
      { code: '401', description: 'Unauthorized' },
      { code: '409', description: 'Conflict' },
    ],
  };

  const LANGS = ['curl', 'js', 'python', 'typescript'] as const;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-16">
      {/* Sticky search header */}
      <div className="sticky top-0 z-20 bg-[var(--background)] border-b-2 border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all endpoints, modules, descriptions..."
              className="w-full pl-9 pr-3 py-2.5 border-0 border-none bg-[var(--code-bg)] text-sm font-mono text-[var(--foreground)] outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 pb-8 space-y-4 mt-4">
        {/* Compact hero stat */}
        <div className="flex items-center justify-between border-2 border-[var(--border)] p-3 neo-depth-zinc">
          <div>
            <span className="text-xs font-black font-mono text-[var(--foreground)]">{endpoints.length} Endpoints</span>
            <span className="text-[10px] font-mono text-[var(--muted)] ml-2">{Object.keys(modules).length} Modules</span>
          </div>

        </div>

        {/* Tab content */}
        {activeTab === 'docs' && (
          <>
            {/* Recently viewed */}
            {recentlyViewed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-[var(--muted)]" />
                  <span className="text-[10px] font-mono font-bold text-[var(--muted)] uppercase tracking-wider">Recent</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 -mx-4 px-4">
                  {recentlyViewed.map(id => {
                    const ep = endpoints.find(e => e.id === id);
                    if (!ep) return null;
                    const mc = getModuleColor(ep.module);
                    return (
                      <button
                        key={id}
                        onClick={() => handleEndpointTap(id)}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-2 border-[var(--border)] text-[11px] font-mono font-bold text-[var(--foreground)] cursor-pointer whitespace-nowrap"
                        style={{ borderLeftColor: theme === 'dark' ? mc.dark : mc.light, borderLeftWidth: 3 }}
                      >
                        <span className={`text-[9px] font-black ${
                          ep.method === 'GET' ? 'text-emerald-500' :
                          ep.method === 'POST' ? 'text-sky-500' :
                          ep.method === 'PATCH' ? 'text-amber-500' : 'text-rose-500'
                        }`}>{ep.method}</span>
                        <span className="truncate max-w-[120px]">{ep.path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Module accordion */}
            <div className="space-y-3">
              {Object.entries(groupedModules).map(([moduleName, eps]) => {
                const isExpanded = expandedModule === moduleName;
                const mc = getModuleColor(moduleName);
                const viewed = eps.filter(e => viewedEndpoints.has(e.id)).length;
                return (
                  <div key={moduleName} className="border-2 border-[var(--border)] overflow-hidden">
                    <button
                      onClick={() => toggleModule(moduleName)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer text-left"
                      style={{
                        borderLeft: `3px solid ${theme === 'dark' ? mc.dark : mc.light}`,
                        background: `${theme === 'dark' ? mc.dark : mc.light}06`,
                      }}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {getModuleIcon(moduleName)}
                        <span className="text-sm font-black font-mono text-[var(--foreground)] truncate">{moduleName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">{eps.length} &middot; {viewed}</span>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-[var(--muted)] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)] shrink-0" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: 'easeInOut' }}
                          className="overflow-hidden border-t border-[var(--border)]"
                        >
                          <div className="space-y-0">
                            {eps.map(ep => {
                              const isPinned = pinnedEndpoints.has(ep.id);
                              const isViewed = viewedEndpoints.has(ep.id);
                              return (
                                <button
                                  key={ep.id}
                                  onClick={() => handleEndpointTap(ep.id)}
                                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer border-b border-[var(--border)] last:border-b-0 active:bg-[var(--code-bg)] transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {methodBadge(ep.method)}
                                    <span className="text-sm font-mono font-bold text-[var(--foreground)] truncate">{ep.path}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isPinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                                    {isViewed && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none" />}
                                    <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)]" />
                                  </div>
                                </button>
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
          </>
        )}

        {/* Recent tab */}
        {activeTab === 'recent' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b-2 border-[var(--border)] pb-2 mb-3">
              <Clock className="h-4 w-4 text-[var(--muted)]" />
              <span className="text-[10px] font-black font-mono uppercase tracking-widest text-[var(--muted)]">Recently Viewed</span>
            </div>
            {recentlyViewed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--border)]">
                <Terminal className="h-10 w-10 mb-3 text-[var(--muted)]" strokeWidth={1.5} />
                <p className="text-xs font-mono text-[var(--muted)] font-bold">No recently viewed endpoints</p>
                <p className="text-[10px] font-mono text-[var(--muted)] mt-1">Tap on an endpoint to view it</p>
              </div>
            ) : (
              recentlyViewed.map(id => {
                const ep = endpoints.find(e => e.id === id);
                if (!ep) return null;
                return (
                  <button
                    key={id}
                    onClick={() => handleEndpointTap(id)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-2 border-[var(--border)] text-left cursor-pointer hover:bg-[var(--card-bg)] transition-colors"
                  >
                    {methodBadge(ep.method)}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono font-bold text-[var(--foreground)] truncate block">{ep.path}</span>
                      <span className="text-[10px] font-mono text-[var(--muted)] truncate block">{ep.summary}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Pinned tab */}
        {activeTab === 'pinned' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b-2 border-[var(--border)] pb-2 mb-3">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-black font-mono uppercase tracking-widest text-[var(--muted)]">Pinned Endpoints</span>
              <span className="text-[10px] font-mono text-[var(--muted)] ml-auto">{pinnedEndpoints.size} pinned</span>
            </div>
            {pinnedEndpoints.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--border)]">
                <Star className="h-10 w-10 mb-3 text-[var(--muted)]" strokeWidth={1.5} />
                <p className="text-xs font-mono text-[var(--muted)] font-bold">No pinned endpoints</p>
                <p className="text-[10px] font-mono text-[var(--muted)] mt-1">Pin endpoints for quick access</p>
              </div>
            ) : (
              [...pinnedEndpoints].map(id => {
                const ep = endpoints.find(e => e.id === id);
                if (!ep) return null;
                return (
                  <button
                    key={id}
                    onClick={() => handleEndpointTap(id)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-2 border-amber-500/30 text-left cursor-pointer hover:bg-amber-500/5 transition-colors"
                  >
                    {methodBadge(ep.method)}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono font-bold text-[var(--foreground)] truncate block">{ep.path}</span>
                      <span className="text-[10px] font-mono text-[var(--muted)] truncate block">{ep.summary}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onTogglePin(ep.id); }}
                      className="p-1 border border-amber-500/30 bg-amber-500/10 text-amber-400 cursor-pointer shrink-0"
                    >
                      <Star className="h-3 w-3 fill-amber-400" />
                    </button>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Empty state */}
        {Object.keys(groupedModules).length === 0 && activeTab === 'docs' && (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-[var(--border)]">
            <Terminal className="h-10 w-10 mb-3 text-[var(--muted)]" strokeWidth={1.5} />
            <h3 className="text-sm font-black text-[var(--muted)] uppercase tracking-wider">No endpoints match</h3>
            <button onClick={() => setSearchQuery('')} className="mt-4 text-xs font-mono font-bold neo-depth-btn px-4 py-2 border-2 border-[var(--foreground)] text-[var(--foreground)] cursor-pointer">
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Full-screen detail panel */}
      <AnimatePresence>
        {showDetail && activeEndpoint && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            drag="x"
            dragConstraints={{ left: 0, right: 100 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80) {
                setShowDetail(false);
              }
            }}
            transition={{ type: 'tween', duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-[var(--background)] overflow-y-auto"
            style={{ willChange: 'transform' }}
          >
            {/* Detail header */}
            <div className="sticky top-0 z-10 bg-[var(--background)] border-b-2 border-[var(--border)] px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setShowDetail(false)}
                className="p-1.5 -ml-1 cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-[var(--foreground)]" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {methodBadge(activeEndpoint.method)}
                  <span className="text-sm font-mono font-bold text-[var(--foreground)] truncate">{activeEndpoint.path}</span>
                </div>
              </div>
            </div>

            <div className="px-4 pb-24 space-y-5 mt-4">
              {/* Summary + module */}
              <div>
                <h2 className="text-base font-black text-[var(--foreground)]">{activeEndpoint.summary}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getModuleIcon(activeEndpoint.module)}
                  <span className="text-[10px] font-mono text-[var(--muted)]">{activeEndpoint.module}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm font-mono text-[var(--muted)] font-medium leading-relaxed">{activeEndpoint.description}</p>

              {/* Status codes */}
              <div className="flex flex-wrap gap-1.5">
                {(STATUS_CODES[activeEndpoint.method] || []).map(s => (
                  <span key={s.code} className={`text-[10px] font-mono font-bold px-2 py-1 border ${
                    s.code.startsWith('2') ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10' :
                    s.code === '404' ? 'border-amber-500/40 text-amber-500 bg-amber-500/10' :
                    s.code.startsWith('4') ? 'border-rose-500/40 text-rose-500 bg-rose-500/10' :
                    'border-sky-500/40 text-sky-500 bg-sky-500/10'
                  }`}>
                    {s.code} {s.description}
                  </span>
                ))}
              </div>

              {/* Code snippet */}
              <div className="border-2 border-[var(--border)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
                  <span className="text-[10px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">
                    <Code2 className="h-3 w-3 inline mr-1.5" />cURL
                  </span>
                  <button
                    onClick={() => onCopy(getSnippet(activeEndpoint, 'curl'), 'mobile-detail')}
                    className="p-1.5 border border-[var(--border)] cursor-pointer"
                  >
                    {copiedId === 'mobile-detail' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono overflow-x-auto leading-relaxed bg-[var(--code-bg)] m-0">{getSnippet(activeEndpoint, 'curl')}</pre>
              </div>

              {/* Response */}
              <div className="border-2 border-[var(--border)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
                  <span className="text-[10px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">
                    <Terminal className="h-3 w-3 inline mr-1.5" />Response
                  </span>
                  <button
                    onClick={() => onCopy(activeEndpoint.response, 'mobile-resp')}
                    className="p-1.5 border border-[var(--border)] cursor-pointer"
                  >
                    {copiedId === 'mobile-resp' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono overflow-x-auto leading-relaxed bg-[var(--code-bg)] m-0 max-h-48">{activeEndpoint.response}</pre>
              </div>

              {/* Parameters */}
              {activeEndpoint.parameters && activeEndpoint.parameters.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black font-mono uppercase tracking-wider text-[var(--muted)] mb-2">Parameters</h4>
                  <div className="space-y-2">
                    {activeEndpoint.parameters.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-mono border-b border-[var(--border)] pb-2">
                        <span className="font-bold text-[var(--foreground)] shrink-0">{p.name}</span>
                        <span className="text-[var(--muted)]">{p.type}</span>
                        {p.required && <span className="text-[var(--foreground)] font-black">*</span>}
                        <span className="text-[var(--muted)] ml-auto text-right">{p.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Try It playground */}
              <div onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2">
                  <Play className="h-3.5 w-3.5 text-[var(--muted)]" />
                  <span className="text-[10px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">Try It</span>
                </div>
                <ApiPlayground endpoint={activeEndpoint} />
              </div>

              {/* Copy URL */}
              <button
                onClick={() => onCopy(`${window.location.origin}?endpoint=${activeEndpoint.id}`, 'mobile-url')}
                className="w-full text-center text-[10px] font-mono font-bold neo-depth-btn px-4 py-3 border-2 border-[var(--foreground)] text-[var(--foreground)] cursor-pointer uppercase tracking-wider"
              >
                {copiedId === 'mobile-url' ? 'Copied!' : 'Copy Link to Endpoint'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t-2 border-[var(--foreground)] bg-[var(--card-bg)] pb-[env(safe-area-inset-bottom)] flex">
        {[
          { id: 'docs', label: 'Docs', icon: BookOpen },
          { id: 'recent', label: 'Recent', icon: Clock },
          { id: 'pinned', label: 'Pinned', icon: Star },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer border-r-2 border-[var(--border)] last:border-r-0 ${
                isActive
                  ? 'text-[var(--foreground)] bg-[var(--foreground)]/5'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="h-4 w-4 stroke-[2.5]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
