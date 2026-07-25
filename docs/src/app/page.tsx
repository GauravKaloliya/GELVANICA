'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useInView, type Variants } from 'framer-motion';
import { Highlight, themes } from 'prism-react-renderer';
import {
  Terminal, Copy, Check, Info, ListCollapse, Link as LinkIcon,
  ChevronDown, ChevronRight, Clock, ArrowUpDown, X, Play,
  BookOpen, WrapText, Code2, RefreshCw, Layers, Star,
  ExternalLink, ArrowDown, Download, Shield, Key, Gauge,
  Globe, GitBranch, AlertTriangle, Eye, Search,
} from 'lucide-react';
import PageWrapper from '@/components/PageWrapper';
import Sidebar from '@/components/Sidebar';
import { ENDPOINTS, Endpoint } from '@/data';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTheme } from '@/components/ThemeProvider';
import Tooltip from '@/components/Tooltip';
const SchemaTree = dynamic(() => import('@/components/SchemaTree'), {
  ssr: false,
  loading: () => <div className="skeleton-block h-48" />,
});
const ApiPlayground = dynamic(() => import('@/components/ApiPlayground'), {
  ssr: false,
  loading: () => <div className="skeleton-block h-36" />,
});
import Image from 'next/image';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getModuleIcon, getModuleColor } from '@/data/icons';
import ParticleGraph from '@/components/ParticleGraph';
import MobileDocs from '@/components/MobileDocs';
import { Routes } from '@gnovium/shared';
import founderImg from '@gnovium/shared/assets/images/founder.png';
import ctoImg from '@gnovium/shared/assets/images/cto.png';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + (process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1');
const METHOD_ORDER = ['GET', 'POST', 'PATCH', 'DELETE'] as const;
const ALL_MODULES = [...new Set(ENDPOINTS.map((ep) => ep.module))].sort();

interface ApiVersion {
  label: string;
  description: string;
  date: string;
  changes: string[];
}

const API_VERSIONS: ApiVersion[] = [
  {
    label: 'v1.0.1',
    description: 'Current — specification & reference release',
    date: '2026-06-22',
    changes: [
      'OpenAPI 3.0.3 specification: 111 operations, 80 paths, 9 schemas',
      'Error catalog: 17 standardized error codes across all modules',
      'Auth guide: OAuth2 PKCE, API keys, PATs, rate limit tiers',
      'CORS configuration guide and versioning policy documentation',
      '6 themes, responsive design, neo-brutalist documentation platform',
    ],
  },
  {
    label: 'v1.0.0',
    description: 'Initial MVP release',
    date: '2026-06',
    changes: [
      '106 endpoints across 22 modules',
      'Auth, Workspaces, Entities, Blocks, Relations, Tags, Graph',
      'Versioning, branches, visual diffs, search, AI',
      'Governance, dashboard, files, sync, notifications, jobs, backups',
      'JWT authentication with access/refresh token pair',
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 150, damping: 20 },
  },
};

const USE_CASE_GUIDES = [
  {
    id: 'personal-kb',
    title: 'Build a Personal Knowledge Base',
    description: 'Create a local-first knowledge graph for research, notes, and learning.',
    steps: [
      'Set GNOVIUM_MODE=local and start the server',
      `Register a user: POST /api/v1/auth/register`,
      'Create a workspace with your name',
      'Create entity types: "Note", "Book", "Idea"',
      'Add entities and connect with typed relations',
      'Use AI search to query your knowledge base',
      'Create branches for different research topics',
      'Merge and diff changes between branches',
    ],
    code: `GNOVIUM_MODE=local python -m app.run

curl -X POST http://localhost:5000/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"me@example.com","password":"secure-pass"}'

curl -X POST http://localhost:5000/api/v1/entities/ \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"workspace_id":"<WS>","title":"Research Notes","entity_type_id":"<TYPE>"}'`,
  },
  {
    id: 'team-collab',
    title: 'Team Collaboration with Cloud Sync',
    description: 'Share a workspace across your team with cloud infrastructure.',
    steps: [
      'Set GNOVIUM_MODE=cloud with NeonDB and S3 configured',
      'Register team members',
      'Create a shared workspace',
      'Set governance policies for write access',
      'Collaborate on entities with real-time sync',
      'Review changes via version diffs',
      'Schedule automated backups',
      'Monitor activity via the dashboard',
    ],
    code: `GNOVIUM_MODE=cloud docker compose up -d

# Create workspace
curl -X POST https://api.gnovium.com/api/v1/workspaces/ \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"name":"Team KB","description":"Shared team knowledge"}'`,
  },
  {
    id: 'graph-app',
    title: 'Build a Graph-Powered Application',
    description: 'Leverage the knowledge graph API for connected data applications.',
    steps: [
      'Model your domain with entity types and relation types',
      'Create entities with properties and tags',
      'Connect entities with semantic relations',
      'Query the graph: traverse, find paths, filter by type',
      'Use the AI endpoint for natural language queries',
      'Visualize graph connections via the graph API',
      'Track changes with versioning and branches',
      'Export data via the sync API',
    ],
    code: `# Query graph
curl -X POST https://api.gnovium.com/api/v1/graph/query \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"workspace_id":"<WS>","filters":{"entity_type":"Note"}}'

# Find path between nodes
curl -X POST https://api.gnovium.com/api/v1/graph/paths \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"workspace_id":"<WS>","source_entity_id":"<A>","target_entity_id":"<B>"}'`,
  },
];

function CodeBlock({ code, language, maxHeight = '200px', id }: { code: string; language: string; maxHeight?: string; id?: string }) {
  const [wrapped, setWrapped] = useState(false);
  const { theme } = useTheme();
  const prismTheme = theme === 'dark' ? themes.oneDark : themes.oneLight;

  const langLabel = language === 'bash' ? 'bash' : language === 'json' ? 'json' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language;

  return (
    <div className="relative code-block-accent">
      <div className="code-block-header flex items-center justify-between px-3 py-1.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
        <span className="text-[9px] font-black font-mono uppercase tracking-widest text-[var(--muted)]">{langLabel}</span>
        <button
          onClick={() => setWrapped(!wrapped)}
          className="p-1 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer bg-[var(--card-bg)]"
          aria-label={wrapped ? 'Disable word wrap' : 'Enable word wrap'}
          title={wrapped ? 'Disable word wrap' : 'Enable word wrap'}
        >
          <WrapText className={`h-3 w-3 ${wrapped ? 'text-[var(--foreground)]' : ''}`} />
        </button>
      </div>
      <Highlight code={code.trimEnd()} language={language} theme={prismTheme}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`p-4 font-mono text-step-1 overflow-x-auto leading-relaxed m-0 ${wrapped ? 'code-wrap' : ''}`}
            style={{ maxHeight, background: 'transparent' }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row code-line">
                <span className="table-cell text-right pr-4 select-none opacity-30 text-step-0 w-8">
                  {i + 1}
                </span>
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

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
    { code: '401', description: 'Unauthorized' },
    { code: '409', description: 'Conflict' },
  ],
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'method-get', POST: 'method-post', PATCH: 'method-patch', DELETE: 'method-delete',
};

const LANGS = ['curl', 'js', 'python', 'typescript'] as const;
const LANG_MAP: Record<string, string> = { curl: 'bash', js: 'javascript', python: 'python', typescript: 'typescript' };

function methodBadge(method: string) {
  const cls = METHOD_COLORS[method] || 'method-get';
  return (
    <span className={`text-[10px] font-black px-2.5 py-0.5 border-2 ${cls} rounded-none`}>
      {method}
    </span>
  );
}

function RevealSection({ children, className = '', role, 'aria-label': ariaLabel, id }: { children: React.ReactNode; className?: string; role?: string; 'aria-label'?: string; id?: string; }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      role={role}
      aria-label={ariaLabel}
      id={id}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ value, label }: { value: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1200;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="text-2xl font-black font-mono text-[var(--foreground)] tabular-nums">{count}</span>
      <span className="text-[9px] font-black font-mono uppercase tracking-widest text-[var(--muted)]">{label}</span>
    </div>
  );
}

function UseCaseGuideCard({ guide, copiedId, onCopy }: { guide: typeof USE_CASE_GUIDES[number]; copiedId: string | null; onCopy: (text: string, id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-2 border-[var(--border)] bg-[var(--card-bg)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)]" />}
        <div>
          <h3 className="display-heading text-sm text-[var(--foreground)]">{guide.title}</h3>
          <p className="text-step-0 font-mono text-[var(--muted)]">{guide.description}</p>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t-2 border-[var(--border)] pt-3">
          <ol className="list-decimal list-inside space-y-1">
            {guide.steps.map((s, i) => (
              <li key={i} className="text-step-0 font-mono text-[var(--muted)]">{s}</li>
            ))}
          </ol>
          <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
              <span className="text-step-0 font-mono text-[var(--muted)] font-bold uppercase">Quick Start Code</span>
              <button onClick={() => onCopy(guide.code, `guide-${guide.id}`)} className="p-1 border border-[var(--border)] neo-depth-btn cursor-pointer" aria-label="Copy guide code">
                {copiedId === `guide-${guide.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <CodeBlock code={guide.code} language="bash" maxHeight="300px" />
          </div>
        </div>
      )}
    </div>
  );
}

function DocsContent() {
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [activeEndpointId, setActiveEndpointId] = useState<string>(() => {
    const urlEndpoint = searchParams.get('endpoint');
    if (urlEndpoint && ENDPOINTS.some(ep => ep.id === urlEndpoint)) return urlEndpoint;
    try {
      const stored = localStorage.getItem('gnovium-active-endpoint');
      if (stored && ENDPOINTS.some(ep => ep.id === stored)) return stored;
    } catch {}
    return ENDPOINTS[0].id;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, 'curl' | 'js' | 'python' | 'typescript'>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<string | null>(null);
  const [sortAlpha, setSortAlpha] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('gnovium-modules');
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return {};
  });
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('gnovium-recent');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });
  const [showFilters, setShowFilters] = useState(false);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [apiVersion, setApiVersion] = useState(API_VERSIONS[API_VERSIONS.length - 1].label);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [responseView, setResponseView] = useState<'raw' | 'tree'>('raw');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuideId, setActiveGuideId] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(() => {
    try { return (localStorage.getItem('gnovium-font-size') as 'sm' | 'md' | 'lg') || 'md'; } catch { return 'md'; }
  });
  const [zenMode, setZenMode] = useState(false);
  const [viewedEndpoints, setViewedEndpoints] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('gnovium-viewed');
      return stored ? new Set(JSON.parse(stored)) : new Set([ENDPOINTS[0].id]);
    } catch { return new Set([ENDPOINTS[0].id]); }
  });

  // Persist viewed endpoints
  useEffect(() => {
    localStorage.setItem('gnovium-viewed', JSON.stringify([...viewedEndpoints]));
  }, [viewedEndpoints]);
  const [announcement, setAnnouncement] = useState(() => `Loaded ${ENDPOINTS.length} endpoints across ${ALL_MODULES.length} modules`);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [pinnedEndpoints, setPinnedEndpoints] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('gnovium-pinned');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  // Persist pinned
  useEffect(() => {
    localStorage.setItem('gnovium-pinned', JSON.stringify([...pinnedEndpoints]));
  }, [pinnedEndpoints]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleCard = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  useEffect(() => {
    localStorage.setItem('gnovium-modules', JSON.stringify(collapsedModules));
  }, [collapsedModules]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (showFilters && filterDialogRef.current && !filterDialogRef.current.open && window.innerWidth < 1024) {
      filterDialogRef.current.showModal();
    } else if (!showFilters && filterDialogRef.current?.open) {
      filterDialogRef.current.close();
    }
  }, [showFilters]);

  const addRecent = useCallback((id: string) => {
    setRecentlyViewed((prev) => {
      const next = [id, ...prev.filter((p) => p !== id)].slice(0, 5);
      try { localStorage.setItem('gnovium-recent', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persist font size
  useEffect(() => { localStorage.setItem('gnovium-font-size', fontSize); }, [fontSize]);

  // Filter + sort
  const filteredEndpoints = useMemo(() => {
    let result = [...ENDPOINTS];
    if (filterMethod) result = result.filter((ep) => ep.method === filterMethod);
    if (filterModule) result = result.filter((ep) => ep.module === filterModule);
    if (sortAlpha) result.sort((a, b) => a.path.localeCompare(b.path));
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.module.toLowerCase().includes(q)
      );
    }
    return result;
  }, [filterMethod, filterModule, sortAlpha, debouncedQuery]);

  const modules = useMemo(() => {
    const grouped: Record<string, Endpoint[]> = {};
    filteredEndpoints.forEach((ep) => {
      if (!grouped[ep.module]) grouped[ep.module] = [];
      grouped[ep.module].push(ep);
    });
    return grouped;
  }, [filteredEndpoints]);

  const toggleModule = (name: string) => {
    setCollapsedModules((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSelect = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(5);
    const endpoint = ENDPOINTS.find((ep) => ep.id === id);
    if (endpoint) setAnnouncement(`Selected ${endpoint.method} ${endpoint.path}`);
    setActiveEndpointId(id);
    localStorage.setItem('gnovium-active-endpoint', id);
    addRecent(id);
    setViewedEndpoints((prev) => new Set(prev).add(id));
    // Expand the parent module
    if (endpoint) {
      setCollapsedModules((prev) => {
        if (prev[endpoint.module]) {
          const next = { ...prev };
          delete next[endpoint.module];
          return next;
        }
        return prev;
      });
    }
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.pushState(null, '', `?endpoint=${id}`);
  };

  const handleGuideSelect = (id: string) => {
    setActiveGuideId(id);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.pushState(null, '', `?section=${id}`);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToast('Copied to clipboard');
    setAnnouncement('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
    setTimeout(() => setToast(null), 2000);
  };

  const getSnippet = (endpoint: Endpoint, lang: 'curl' | 'js' | 'python' | 'typescript') => {
    const url = `${API_BASE_URL}${endpoint.path}`;
    const headers = endpoint.headers || {
      'Content-Type': 'application/json',
      ...(endpoint.id.startsWith('auth') ? {} : { Authorization: 'Bearer gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }),
    };

    if (lang === 'curl') {
      const headerStr = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' \\\n  ');
      const bodyStr = endpoint.requestBody ? ` \\\n  -d '${endpoint.requestBody.replace(/\n\s*/g, '')}'` : '';
      return `curl -X ${endpoint.method} ${url} \\\n  ${headerStr}${bodyStr}`;
    }
    if (lang === 'js') {
      const opts: Record<string, unknown> = { method: endpoint.method, headers };
      if (endpoint.requestBody) { try { opts.body = JSON.parse(endpoint.requestBody); } catch { opts.body = endpoint.requestBody; } }
      return `fetch("${url}", ${JSON.stringify(opts, null, 2)});`;
    }
    if (lang === 'python') {
      const reqHeaders = JSON.stringify(headers, null, 2);
      let reqData = '';
      if (endpoint.requestBody) {
        try { reqData = `, json=${JSON.stringify(JSON.parse(endpoint.requestBody), null, 2)}`; }
        catch { reqData = `, data='''${endpoint.requestBody}'''`; }
      }
      return `import requests\n\nresponse = requests.${endpoint.method.toLowerCase()}(\n    "${url}",\n    headers=${reqHeaders}${reqData}\n)\nprint(response.json())`;
    }
    if (lang === 'typescript') {
      const opts: Record<string, unknown> = { method: endpoint.method, headers };
      if (endpoint.requestBody) { try { opts.body = JSON.parse(endpoint.requestBody); } catch { opts.body = endpoint.requestBody; } }
      return `const response = await fetch("${url}", ${JSON.stringify(opts, null, 2)});\nconst data = await response.json();`;
    }
    return '';
  };

  // Keyboard shortcuts for tabs
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') {
        setActiveTabs((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => { next[k] = 'curl'; });
          return next;
        });
      }
      if (e.key === '2') {
        setActiveTabs((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => { next[k] = 'js'; });
          return next;
        });
      }
      if (e.key === '3') {
        setActiveTabs((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => { next[k] = 'python'; });
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Autocomplete search suggestions
  const autocompleteResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return ENDPOINTS.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.module.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [debouncedQuery]);

  const activeEndpoint = ENDPOINTS.find((ep) => ep.id === activeEndpointId);

  return (
    <div className="flex flex-col lg:flex-row gap-8 relative items-start" id="main-content">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex flex-col shrink-0 self-stretch sticky top-24 max-h-[calc(100vh-8rem)] transition-all duration-300 ease-in-out overflow-hidden ${
        zenMode ? 'w-0 min-w-0 opacity-0 p-0 border-0' : 'w-72 pr-2'
      }`}>
        <Sidebar
          endpoints={filterMethod ? ENDPOINTS.filter((ep) => ep.method === filterMethod) : ENDPOINTS}
          activeId={activeEndpointId}
          onSelect={handleSelect}
          activeGuideId={activeGuideId}
          onGuideSelect={handleGuideSelect}
          filterMethod={filterMethod || undefined}
          viewedEndpoints={viewedEndpoints}
          zenMode={zenMode}
          onToggleZenMode={() => setZenMode(z => !z)}
        />
      </div>

      {/* Floating sidebar toggle (visible when sidebar is hidden) */}
      <button
        onClick={() => setZenMode(false)}
        className={`hidden lg:flex fixed left-20 top-28 z-30 p-2 border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-[var(--foreground)] neo-depth-btn transition-all duration-300 cursor-pointer ${
          zenMode ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
        }`}
        aria-label="Show sidebar"
        title="Show sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
      </button>

      <div className={`hidden lg:block flex-1 min-w-0 space-y-8 transition-all duration-300 ease-in-out ${
        zenMode ? 'max-w-none' : 'max-w-[960px]'
      }`} data-font-size={fontSize} role="region" aria-label="API documentation content">
        {/* ── Header + Hero ────────────────────────── */}
        <RevealSection>
        <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] hero-depth flex flex-col md:flex-row items-center justify-between gap-8 mb-6 overflow-hidden relative min-h-[300px]" role="region" aria-label="Documentation header">
          {/* Animated particle graph background */}
          <ParticleGraph />

          {/* Gradient overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[length:200%_200%]" style={{
            backgroundImage: 'linear-gradient(135deg, var(--foreground) 0%, transparent 50%, var(--foreground) 100%)',
            animation: 'shimmer 4s ease-in-out infinite',
          }} />

          <div className="relative z-10 space-y-5 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 14 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-step-0 font-black tracking-widest uppercase font-mono"
            >
              <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
              LOCAL-FIRST · OFFLINE-CAPABLE · AI-NATIVE
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 16 }}
              className="display-heading text-[var(--foreground)] uppercase"
            >
              API Documentation
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 16 }}
              className="text-xs sm:text-sm text-[var(--muted)] font-mono font-black uppercase tracking-wider"
            >
              KNOWLEDGE OS FOR HUMANS &amp; MACHINES
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed font-mono font-bold"
            >
              Gnovium API is a local-first Knowledge Operating System for building applications where knowledge behaves like a living system rather than a collection of disconnected documents.
            </motion.p>

            {/* Animated stat counter */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 100, damping: 16 }}
              className="flex gap-6 pt-1"
            >
              <AnimatedCounter value={ENDPOINTS.length} label="Endpoints" />
              <AnimatedCounter value={ALL_MODULES.length} label="Modules" />
              <AnimatedCounter value={111} label="Operations" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 16 }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              {/* Version selector */}
              <select
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                className="text-step-0 font-black font-mono uppercase tracking-wider px-2.5 py-1.5 border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] cursor-pointer"
              >
                <option value="v1.0.0">v1.0.0</option>
                <option value="v1.1.0">v1.1.0 (beta)</option>
              </select>

              {/* Mode switcher */}
              <div className="flex border-2 border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => setMode('local')}
                  className={`px-2.5 py-1.5 text-step-0 font-black font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    mode === 'local'
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] bg-[var(--card-bg)]'
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => setMode('cloud')}
                  className={`px-2.5 py-1.5 text-step-0 font-black font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    mode === 'cloud'
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] bg-[var(--card-bg)]'
                  }`}
                >
                  Cloud
                </button>
              </div>

              {/* Dual CTAs */}
              <button
                onClick={() => {
                  const el = document.getElementById('quickstart-guide');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-xs font-black font-mono uppercase tracking-wider px-5 py-2.5 border-2 border-[var(--foreground)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-2 cursor-pointer"
              >
                Start in Local Mode
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('rate-limits');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-xs font-black font-mono uppercase tracking-wider px-5 py-2.5 border-2 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-2 cursor-pointer bg-[var(--card-bg)]"
              >
                Explore Cloud
                <Globe className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </div>

          {/* Cute illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 14 }}
            className="relative z-10 hidden md:block shrink-0 p-6 ml-4"
          >
            <motion.svg
              width="220"
              height="220"
              viewBox="0 0 160 160"
              fill="none"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Body */}
              <rect x="40" y="70" width="80" height="65" rx="12" stroke="var(--foreground)" strokeWidth="3" fill="var(--card-bg)" />
              {/* Face */}
              <circle cx="65" cy="100" r="6" fill="var(--foreground)" />
              <circle cx="95" cy="100" r="6" fill="var(--foreground)" />
              <path
                d="M68 118 Q80 128 92 118"
                stroke="var(--foreground)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Blush */}
              <circle cx="55" cy="108" r="5" fill="var(--accent)" opacity="0.3" />
              <circle cx="105" cy="108" r="5" fill="var(--accent)" opacity="0.3" />
              {/* Antenna */}
              <line x1="80" y1="70" x2="80" y2="50" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
              <motion.circle
                cx="80" cy="45" r="6"
                stroke="var(--foreground)" strokeWidth="2.5"
                fill="var(--accent)"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Ears */}
              <rect x="32" y="85" width="10" height="15" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
              <rect x="118" y="85" width="10" height="15" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
              {/* Arms */}
              <motion.rect
                x="28" y="82" width="14" height="8" rx="4"
                stroke="var(--foreground)" strokeWidth="2" fill="var(--card-bg)"
                animate={{ rotate: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: 'center' }}
              />
              <motion.rect
                x="118" y="82" width="14" height="8" rx="4"
                stroke="var(--foreground)" strokeWidth="2" fill="var(--card-bg)"
                animate={{ rotate: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: 'center' }}
              />
              {/* Feet */}
              <rect x="48" y="128" width="18" height="10" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
              <rect x="94" y="128" width="18" height="10" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
              {/* Heart */}
              <motion.path
                d="M130 35 C130 30 125 25 120 25 C114 25 110 30 110 35 C110 42 120 48 120 48 C120 48 130 42 130 35Z"
                stroke="var(--foreground)" strokeWidth="2"
                fill="var(--accent)" opacity="0.6"
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              />
              {/* Sparkles */}
              <motion.text x="15" y="38" fontSize="14" fill="var(--foreground)" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>✦</motion.text>
              <motion.text x="140" y="60" fontSize="10" fill="var(--foreground)" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>✦</motion.text>
            </motion.svg>
          </motion.div>
        </div>
        </RevealSection>

        {/* ── Breadcrumbs ────────────────────────── */}
        <RevealSection>
          <Breadcrumbs segments={[{ label: 'API Documentation', current: true }]} />
        </RevealSection>

        {/* ── Founder Profile Hero Card ────────────── */}
        <RevealSection>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 18 }}
          className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        >
          {/* Founder Avatar */}
          <div className="w-16 h-16 border-[3px] border-[var(--foreground)] bg-[var(--code-bg)] flex items-center justify-center shrink-0 neo-depth-btn overflow-hidden">
            <Image
              src={founderImg}
              alt="Gaurav Kaloliya"
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          </div>

          {/* Founder Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <span className="text-[9px] font-black font-mono uppercase tracking-[0.2em] text-[var(--muted)]">Created &amp; Visioned by</span>
              <span className="text-base font-black font-mono text-[var(--foreground)] tracking-tight">GAURAV KALOLIYA</span>
              <span className="px-2 py-0.5 border border-[var(--border)] text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">Founder &amp; Creator</span>
            </div>
            <blockquote className="text-xs text-[var(--muted)] font-mono italic leading-relaxed border-l-2 border-[var(--border)] pl-3">
              &ldquo;Gnovium was born from a simple belief — that knowledge should behave like a living system, not a graveyard of documents. Every feature, every endpoint, every line of code was built to make that vision real.&rdquo;
            </blockquote>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417"
              target="_blank"
              rel="noopener noreferrer"
              className="text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" /> LinkedIn
            </a>
            <a
              href="https://github.com/GauravKaloliya/gnovium"
              target="_blank"
              rel="noopener noreferrer"
              className="text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5"
            >
              <Star className="h-3 w-3" /> GitHub
            </a>
          </div>
        </motion.div>
        </RevealSection>

        {/* ── CTO Profile Hero Card ────────────── */}
        <RevealSection>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 18 }}
          className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        >
          {/* CTO Avatar */}
          <div className="w-16 h-16 border-[3px] border-[var(--foreground)] bg-[var(--code-bg)] flex items-center justify-center shrink-0 neo-depth-btn overflow-hidden">
            <Image
              src={ctoImg}
              alt="Arpita Makwana"
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          </div>

          {/* CTO Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <span className="text-[9px] font-black font-mono uppercase tracking-[0.2em] text-[var(--muted)]">Built by</span>
              <span className="text-base font-black font-mono text-[var(--foreground)] tracking-tight">ARPITA MAKWANA</span>
              <span className="px-2 py-0.5 border border-[var(--border)] text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">CTO</span>
            </div>
            <blockquote className="text-xs text-[var(--muted)] font-mono italic leading-relaxed border-l-2 border-[var(--border)] pl-3">
              &ldquo;I&rsquo;ve shipped a lot of code. This is the only system I&rsquo;d call my proudest work — not because it&rsquo;s perfect, but because every microservice, every query path, every failure mode was engineered with intention. Knowledge this fluid doesn&rsquo;t happen by accident. It happens because someone gave a damn about the seams.&rdquo;
            </blockquote>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://www.linkedin.com/in/arpita-makwana-3a7a57269"
              target="_blank"
              rel="noopener noreferrer"
              className="text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" /> LinkedIn
            </a>
            <a
              href="https://github.com/ArpitaMakvana"
              target="_blank"
              rel="noopener noreferrer"
              className="text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5"
            >
              <Star className="h-3 w-3" /> GitHub
            </a>
          </div>
        </motion.div>
        </RevealSection>

        {/* ── Search / Version / Filter Bar ────────── */}
        <RevealSection>
        <div className="flex flex-wrap items-center gap-3 p-4 border-2 border-[var(--border)] bg-[var(--card-bg)]" role="search">
          {/* Search with autocomplete */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchSuggestions(true); }}
              placeholder="Search all endpoints, modules, descriptions..."
              className="h-10 w-full bg-transparent px-3 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/40 font-mono font-bold uppercase tracking-wider"
              aria-label="Search query"
            />
            {showSearchSuggestions && autocompleteResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 border-2 border-[var(--border)] bg-[var(--card-bg)] z-20 mt-1 shadow-lg">
                {autocompleteResults.map((ep) => (
                  <button
                    key={ep.id}
                    onMouseDown={() => { handleSelect(ep.id); setSearchQuery(''); setShowSearchSuggestions(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-step-0 font-mono hover:bg-[var(--code-bg)] text-[var(--foreground)] cursor-pointer"
                  >
                    {methodBadge(ep.method)}
                    <span className="truncate">{ep.path}</span>
                    <span className="ml-auto text-[var(--muted)] text-[9px] uppercase tracking-wider">{ep.module}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version selector */}
          <div className="relative">
            <button
              onClick={() => setShowVersionInfo(!showVersionInfo)}
              className="text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="h-3 w-3" /> {apiVersion}
            </button>
            {showVersionInfo && (
              <div className="absolute top-full right-0 border-2 border-[var(--border)] bg-[var(--card-bg)] z-20 mt-1 w-72 shadow-lg">
                {API_VERSIONS.map((v) => (
                  <button
                    key={v.label}
                    onClick={() => { setApiVersion(v.label); setShowVersionInfo(false); }}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-b-0 cursor-pointer hover:bg-[var(--code-bg)] ${
                      apiVersion === v.label ? 'bg-[var(--code-bg)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black font-mono text-[var(--foreground)]">{v.label}</span>
                      <span className="text-[9px] font-mono text-[var(--muted)]">{v.date}</span>
                      {v === API_VERSIONS[API_VERSIONS.length - 1] && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 bg-[var(--foreground)] text-[var(--background)] font-mono ml-auto">LATEST</span>
                      )}
                    </div>
                    <p className="text-step-0 font-mono text-[var(--muted)] mt-0.5">{v.description}</p>
                    <div className="mt-1.5 space-y-0.5">
                      {v.changes.map((c, i) => (
                        <div key={i} className="changelog-entry text-[9px] font-mono text-[var(--muted)]">{c}</div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-step-0 font-mono text-[var(--muted)]">{filteredEndpoints.length} / {ENDPOINTS.length}</span>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-step-0 font-black font-mono uppercase tracking-wider neo-depth-btn px-3 py-1.5 border-2 border-[var(--foreground)] text-[var(--foreground)] cursor-pointer flex items-center gap-1.5"
          >
            <ArrowUpDown className="h-3 w-3" /> {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
        </div>
        </RevealSection>

        {/* Continue + On this page */}
        <RevealSection>
        <div className="space-y-3">
          {recentlyViewed.length > 0 && recentlyViewed[0] !== ENDPOINTS[0].id && (
            <div className="border-2 border-[var(--border)] p-3 flex items-center justify-between neo-depth-zinc">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-[var(--muted)]" />
                <div>
                  <span className="text-step-0 font-mono font-black uppercase tracking-wider text-[var(--muted)]">Continue where you left off</span>
                  <p className="text-step-0 font-mono font-bold text-[var(--foreground)] mt-0.5">
                    {(() => {
                      const ep = ENDPOINTS.find(e => e.id === recentlyViewed[0]);
                      return ep ? `${ep.method} ${ep.path}` : '';
                    })()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleSelect(recentlyViewed[0])}
                className="text-step-0 font-mono font-bold neo-depth-btn px-3 py-1.5 border-2 border-[var(--foreground)] cursor-pointer uppercase tracking-wider"
              >
                Resume
              </button>
            </div>
          )}

          {activeEndpoint && !zenMode && (
            <div className="border-2 border-[var(--border)] p-3 neo-depth-zinc">
              <h4 className="text-step-0 font-black font-mono uppercase tracking-widest text-[var(--muted)] mb-2">On this page</h4>
              <div className="flex flex-wrap gap-1">
                {ENDPOINTS.filter(ep => ep.module === activeEndpoint.module).map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => handleSelect(ep.id)}
                    className={`text-step-0 font-mono font-bold px-2 py-1 truncate border-l-2 transition-all cursor-pointer ${
                      ep.id === activeEndpointId
                        ? 'border-[var(--foreground)] text-[var(--foreground)] bg-[var(--foreground)]/5'
                        : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                    }`}
                  >
                    <span className={`inline-block w-8 text-[9px] font-black ${
                      ep.method === 'GET' ? 'text-emerald-500' :
                      ep.method === 'POST' ? 'text-sky-500' :
                      ep.method === 'PATCH' ? 'text-amber-500' : 'text-rose-500'
                    }`}>{ep.method}</span>
                    <span className="truncate">{ep.path}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </RevealSection>

        {/* ── Filters row (desktop) ─────────────────── */}
        <div className={`${showFilters ? 'lg:flex' : 'hidden'} hidden flex-wrap items-center gap-2`}>
          {METHOD_ORDER.map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(filterMethod === m ? null : m)}
              className={`text-step-0 font-black px-2.5 py-1 border-2 rounded-none cursor-pointer transition-all ${
                filterMethod === m
                  ? `${METHOD_COLORS[m]} border-[var(--foreground)] neo-depth-btn`
                  : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]'
              }`}
            >
              {m}
            </button>
          ))}
          <div className="w-px h-5 bg-[var(--border)]" />
          <select
            value={filterModule || ''}
            onChange={(e) => setFilterModule(e.target.value || null)}
            className="text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1 border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-none cursor-pointer"
          >
            <option value="">All Modules</option>
            {ALL_MODULES.map((m) => (<option key={m} value={m}>{m}</option>))}
          </select>
          <button
            onClick={() => setSortAlpha(!sortAlpha)}
            className={`text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1 border-2 rounded-none cursor-pointer transition-all ${
              sortAlpha ? 'border-[var(--foreground)] neo-depth-btn' : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            A-Z
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className={`text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1 border-2 rounded-none cursor-pointer transition-all ${
              viewMode === 'grid' ? 'border-[var(--foreground)] neo-depth-btn' : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            {viewMode === 'list' ? '⠿ Grid' : '≡ List'}
          </button>
          <button
            onClick={() => setShowFilters(false)}
            className="text-step-0 font-mono text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer ml-auto"
          >
            <X className="h-3 w-3 inline" /> Hide
          </button>
        </div>

        {/* ── Filters dialog (mobile) ───────────────── */}
        <dialog
          ref={filterDialogRef}
          className="lg:hidden fixed inset-0 z-40 bg-[var(--background)] border-2 border-[var(--foreground)] p-0 backdrop:bg-black/50"
          onClick={(e) => { if (e.target === filterDialogRef.current) { setShowFilters(false); filterDialogRef.current?.close(); } }}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-3">
              <span className="text-step-0 font-black font-mono uppercase tracking-wider">Filters</span>
              <button
                onClick={() => { setShowFilters(false); filterDialogRef.current?.close(); }}
                className="p-1 border-2 border-[var(--border)] neo-depth-btn cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {METHOD_ORDER.map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMethod(filterMethod === m ? null : m)}
                    className={`text-step-0 font-black px-3 py-1.5 border-2 rounded-none cursor-pointer transition-all ${
                      filterMethod === m
                        ? `${METHOD_COLORS[m]} border-[var(--foreground)] neo-depth-btn`
                        : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <select
                value={filterModule || ''}
                onChange={(e) => setFilterModule(e.target.value || null)}
                className="text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-none cursor-pointer w-full"
              >
                <option value="">All Modules</option>
                {ALL_MODULES.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortAlpha(!sortAlpha)}
                  className={`flex-1 text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 rounded-none cursor-pointer transition-all ${
                    sortAlpha ? 'border-[var(--foreground)] neo-depth-btn' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  A-Z {sortAlpha ? '✓' : ''}
                </button>
                <button
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                  className={`flex-1 text-step-0 font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 rounded-none cursor-pointer transition-all ${
                    viewMode === 'grid' ? 'border-[var(--foreground)] neo-depth-btn' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {viewMode === 'grid' ? 'Grid ✓' : 'List'}
                </button>
              </div>
            </div>
          </div>
        </dialog>

        {/* ── Recently Viewed ──────────────────────── */}
        {recentlyViewed.length > 0 && (
          <div id="recently-viewed-section" className="flex flex-wrap items-center gap-2 px-1" role="region" aria-label="Recently viewed endpoints">
            <Clock className="h-3 w-3 text-[var(--muted)]" />
            <span className="text-step-0 font-mono font-bold text-[var(--muted)] uppercase tracking-wider">Recent</span>
            <div className="flex flex-wrap gap-1.5 ml-1">
              {recentlyViewed.map((id) => {
                const ep = ENDPOINTS.find(e => e.id === id);
                if (!ep) return null;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelect(id)}
                    className="text-step-0 font-mono font-bold px-2 py-0.5 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <span className={`w-1.5 h-1.5 rounded-none ${
                      ep.method === 'GET' ? 'bg-emerald-500' :
                      ep.method === 'POST' ? 'bg-sky-500' :
                      ep.method === 'PATCH' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    {ep.path}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MVP Quickstart ───────────────────────── */}
        <RevealSection>
        <div id="quickstart-guide" className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] neo-depth mb-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-step-0 font-black tracking-widest uppercase font-mono neo-depth-btn mb-2">
            Quickstart · MVP Flows
          </div>
          <h2 className="display-heading text-lg text-[var(--foreground)] mb-1">Core Developer Flows</h2>
          <p className="text-xs text-[var(--muted)] font-mono leading-relaxed mb-4">
            Step-by-step flows to go from zero to a fully functioning Knowledge OS workspace.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6">
              <div className="text-step-0 font-black uppercase tracking-widest text-emerald-500 font-mono mb-2">Local Mode (Default)</div>
              <p className="text-sm text-[var(--muted)] leading-relaxed">Your knowledge stays yours. Run Gnovium entirely on your device with zero setup.</p>
              <div className="mt-3"><code className="bg-[var(--code-bg)] px-2 py-1 text-xs font-mono">GNOVIUM_MODE=local</code></div>
            </div>
            <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6">
              <div className="text-step-0 font-black uppercase tracking-widest text-sky-500 font-mono mb-2">Cloud Mode</div>
              <p className="text-sm text-[var(--muted)] leading-relaxed">Transform personal knowledge into shared intelligence.</p>
              <div className="mt-3"><code className="bg-[var(--code-bg)] px-2 py-1 text-xs font-mono">GNOVIUM_MODE=cloud</code></div>
            </div>
          </div>

          {[
            { step: '01', title: 'Register & Authenticate', endpoints: 'POST /api/v1/auth/register → POST /api/v1/auth/login', desc: 'Create an account then log in.', code: `curl -X POST https://api.gnovium.com/api/v1/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"admin@gnovium.dev","password":"change-me-123"}'` },
            { step: '02', title: 'Create a Workspace', endpoints: 'POST /api/v1/workspaces/', desc: 'Every entity, block, and graph lives inside a workspace.', code: `curl -X POST https://api.gnovium.com/api/v1/workspaces/ \\\n  -H "Authorization: Bearer gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" \\\n  -d '{"name":"Knowledge OS","description":"My local knowledge graph"}'` },
            { step: '03', title: 'Create Entity + Blocks', endpoints: 'POST /api/v1/entities/ → POST /api/v1/blocks/', desc: 'Create a page entity, then append content blocks.', code: `# Create entity\ncurl -X POST https://api.gnovium.com/api/v1/entities/ \\\n  -H "Authorization: Bearer gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" \\\n  -d '{"workspace_id":"<WS_ID>","title":"Research Notes","entity_type_id":"<TYPE_ID>"}'` },
            { step: '04', title: 'Add Relations', endpoints: 'POST /api/v1/relations/', desc: 'Connect entities with typed edges.', code: `curl -X POST https://api.gnovium.com/api/v1/relations/ \\\n  -H "Authorization: Bearer gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" \\\n  -d '{"workspace_id":"<WS_ID>","source_entity_id":"<A>","target_entity_id":"<B>","relation_type":"references"}'` },
            { step: '05', title: 'Query the Graph', endpoints: 'POST /api/v1/graph/query · /graph/traverse · /graph/paths', desc: 'Explore the graph.', code: `curl -X POST https://api.gnovium.com/api/v1/graph/traverse \\\n  -H "Authorization: Bearer gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" \\\n  -d '{"workspace_id":"<WS_ID>","center_node":"<ID>","depth":2}'` },
            { step: '06', title: 'Ask AI', endpoints: 'POST /api/v1/ai/query', desc: 'Submit a natural language question.', code: `curl -X POST https://api.gnovium.com/api/v1/ai/query \\\n  -H "Authorization: Bearer gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" \\\n  -d '{"workspace_id":"<WS_ID>","question":"Summarize authentication"}'` },
          ].map(({ step, title, endpoints, desc, code }) => (
            <div key={step} className="border-l-[3px] border-[var(--foreground)] pl-6 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-step-0 font-black px-2 py-0.5 bg-[var(--foreground)] text-[var(--background)] font-mono tracking-widest">{step}</span>
                <h3 className="display-heading text-sm text-[var(--foreground)] uppercase tracking-tight">{title}</h3>
              </div>
              <div className="text-step-0 font-mono text-[var(--muted)] tracking-widest uppercase">{endpoints}</div>
              <p className="text-xs text-[var(--muted)] font-mono leading-relaxed">{desc}</p>
              <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
                  <span className="text-step-0 font-mono text-[var(--muted)] font-bold uppercase">Example</span>
                  <button onClick={() => handleCopy(code, `qs-${step}`)} className="p-1 border border-[var(--border)] neo-depth-btn cursor-pointer" aria-label="Copy">
                    {copiedId === `qs-${step}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <CodeBlock code={code} language="bash" maxHeight="300px" />
              </div>
            </div>
          ))}
        </div>
        </RevealSection>

        {/* ── Use-Case Guides ───────────────────────── */}
        <RevealSection>
        <div className="space-y-4 mb-6">
          <h2 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Use-Case Guides
          </h2>
          {USE_CASE_GUIDES.map((guide) => (
            <UseCaseGuideCard key={guide.id} guide={guide} copiedId={copiedId} onCopy={handleCopy} />
          ))}
        </div>
        </RevealSection>

        {/* ── Authentication Guide ──────────────────── */}
        <RevealSection>
        <div id="auth-guide" className="space-y-4 mb-6">
          <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] neo-depth space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-step-0 font-black tracking-widest uppercase font-mono neo-depth-btn mb-2">
              <Shield className="h-3.5 w-3.5" /> Authentication
            </div>
            <h2 className="display-heading text-lg text-[var(--foreground)] mb-1">Authentication Guide</h2>
            <p className="text-xs text-[var(--muted)] font-mono leading-relaxed mb-4">
              Gnovium supports three authentication methods. Choose the one that fits your use case.
              All authenticated requests must include credentials in the header.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Shield, title: 'OAuth 2.0 + PKCE', best: 'Web & mobile apps',
                  desc: 'Recommended for applications acting on behalf of users. Uses authorization code flow with PKCE for secure token exchange.',
                  setup: ['Register app for client_id', 'Redirect users to /oauth/authorize', 'Exchange code for tokens via /oauth/token', 'Use Bearer token in requests'],
                },
                {
                  icon: Key, title: 'API Keys', best: 'Server-to-server, CI/CD',
                  desc: 'Static long-lived tokens for service accounts. Generate from workspace settings. Treat as secrets — rotate periodically.',
                  setup: ['Generate key from workspace settings', 'Set appropriate scopes', 'Include as X-API-Key header', 'Rotate if compromised'],
                },
                {
                  icon: Key, title: 'Personal Access Tokens', best: 'CLI, personal scripts',
                  desc: 'User-scoped tokens for developer tooling. Inherit your permissions. Revocable individually.',
                  setup: ['Generate from user settings', 'Copy token immediately', 'Use as Bearer token in header', 'Revoke from settings if compromised'],
                },
              ].map(({ icon: Icon, title, best, desc, setup }) => (
                <div key={title} className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-[var(--foreground)]" strokeWidth={2} />
                    <h3 className="display-heading text-sm text-[var(--foreground)] uppercase tracking-tight">{title}</h3>
                  </div>
                  <div className="text-[9px] font-black font-mono uppercase tracking-widest text-emerald-500 mb-2">Best for: {best}</div>
                  <p className="text-step-0 font-mono text-[var(--muted)] leading-relaxed mb-3">{desc}</p>
                  <ol className="space-y-1 mt-auto">
                    {setup.map((s, i) => (
                      <li key={i} className="text-step-0 font-mono text-[var(--muted)] flex items-start gap-1.5">
                        <span className="text-[var(--foreground)] font-bold shrink-0">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            {/* Code Examples */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                <div className="px-3 py-1.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)] text-step-0 font-mono text-[var(--muted)] font-bold uppercase">OAuth2 Authorization Code Flow</div>
                <CodeBlock code={`# Authorization URL (redirect user)
GET https://api.gnovium.com/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=workspace:read+workspace:write

# Exchange code for tokens
POST https://api.gnovium.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID

# Use access token
curl -X GET https://api.gnovium.com/api/v1/workspaces/ \\
  -H "Authorization: Bearer gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"`} language="bash" maxHeight="280px" />
              </div>
              <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                <div className="px-3 py-1.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)] text-step-0 font-mono text-[var(--muted)] font-bold uppercase">API Key & PAT Examples</div>
                <CodeBlock code={`# API Key (X-API-Key header)
curl -X GET https://api.gnovium.com/api/v1/workspaces/ \\
  -H "X-API-Key: gnovium_live_abc123..."

# Personal Access Token (Bearer)
curl -X GET https://api.gnovium.com/api/v1/auth/me \\
  -H "Authorization: Bearer gnovium_pat_abc123..."

# Python with API Key
import requests
response = requests.get(
    "https://api.gnovium.com/api/v1/workspaces/",
    headers={"X-API-Key": "gnovium_live_abc123..."}
)

# JavaScript with PAT
const response = await fetch(
  "https://api.gnovium.com/api/v1/auth/me",
  { headers: { Authorization: "Bearer gnovium_pat_abc123..." } }
)`} language="bash" maxHeight="280px" />
              </div>
            </div>
          </div>
        </div>
        </RevealSection>

        {/* ── Rate Limits ──────────────────────────── */}
        <RevealSection>
        <div id="rate-limits" className="space-y-4 mb-6">
          <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] neo-depth space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-step-0 font-black tracking-widest uppercase font-mono neo-depth-btn mb-2">
              <Gauge className="h-3.5 w-3.5" /> Rate Limits
            </div>
            <h2 className="display-heading text-lg text-[var(--foreground)] mb-1">Rate Limits & Backoff Strategy</h2>
            <p className="text-xs text-[var(--muted)] font-mono leading-relaxed mb-4">
              Rate limits protect the API from abuse and ensure fair resource allocation. Limits vary by plan tier.
              Every API response includes rate limit headers to help you manage your consumption.
            </p>

            <div className="overflow-x-auto border-2 border-[var(--border)]">
              <table className="w-full text-left border-collapse text-step-0">
                <thead>
                  <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                    <th className="p-3">Tier</th>
                    <th className="p-3">Requests/Min</th>
                    <th className="p-3">Requests/Hour</th>
                    <th className="p-3">Burst</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                  {[
                    { tier: 'Free', rpm: 30, rph: 500, burst: 10, desc: 'Personal use, development, testing' },
                    { tier: 'Pro', rpm: 120, rph: 3000, burst: 30, desc: 'Small teams, power users, priority queue' },
                    { tier: 'Team', rpm: 500, rph: 10000, burst: 100, desc: 'Team collaboration, higher throughput' },
                    { tier: 'Enterprise', rpm: 2000, rph: 50000, burst: 250, desc: 'Large-scale, custom limits available' },
                  ].map((row) => (
                    <tr key={row.tier} className="hover:bg-[var(--card-bg)]">
                      <td className="p-3 font-bold text-[var(--foreground)]">{row.tier}</td>
                      <td className="p-3">{row.rpm.toLocaleString()}</td>
                      <td className="p-3">{row.rph.toLocaleString()}</td>
                      <td className="p-3">{row.burst}</td>
                      <td className="p-3">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <h3 className="display-heading text-xs text-[var(--foreground)] uppercase tracking-wider">Rate Limit Headers</h3>
                <div className="overflow-x-auto border-2 border-[var(--border)]">
                  <table className="w-full text-left border-collapse text-step-0">
                    <thead>
                      <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                        <th className="p-2.5">Header</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                      {[
                        { header: 'X-RateLimit-Limit', desc: 'Max requests per hour', ex: '500' },
                        { header: 'X-RateLimit-Remaining', desc: 'Requests left in window', ex: '423' },
                        { header: 'X-RateLimit-Reset', desc: 'Unix timestamp of reset', ex: '1758470400' },
                        { header: 'Retry-After', desc: 'Seconds to wait (429 only)', ex: '30' },
                      ].map((h) => (
                        <tr key={h.header} className="hover:bg-[var(--card-bg)]">
                          <td className="p-2.5 font-semibold text-[var(--foreground)] font-mono">{h.header}</td>
                          <td className="p-2.5">{h.desc}</td>
                          <td className="p-2.5 font-mono">{h.ex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="display-heading text-xs text-[var(--foreground)] uppercase tracking-wider">Exponential Backoff Strategy</h3>
                <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] p-4">
                    <pre className="font-mono text-step-1 text-[var(--muted)] leading-relaxed overflow-x-auto">{`1. Check Retry-After header
2. If present, wait that many seconds
3. If absent, use exponential backoff:
   - Initial: 1 second
   - Multiply: 2x per retry
   - Maximum: 60 seconds
   - Max retries: 5
4. Add ±20% random jitter
5. Distribute requests evenly`}</pre>
                </div>
                <div className="text-step-0 font-mono text-[var(--muted)] leading-relaxed p-3 border-2 border-[var(--border)]">
                  <strong className="text-[var(--foreground)]">Best Practices:</strong> Cache responses where possible, batch operations using bulk endpoints, distribute requests evenly across the time window, and monitor rate limit headers to proactively slow down before hitting limits.
                </div>
              </div>
            </div>
          </div>
        </div>
        </RevealSection>

        {/* ── CORS Configuration ───────────────────── */}
        <RevealSection>
        <div id="cors-config" className="space-y-4 mb-6">
          <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] neo-depth space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-step-0 font-black tracking-widest uppercase font-mono neo-depth-btn mb-2">
              <Globe className="h-3.5 w-3.5" /> CORS
            </div>
            <h2 className="display-heading text-lg text-[var(--foreground)] mb-1">CORS Configuration</h2>
            <p className="text-xs text-[var(--muted)] font-mono leading-relaxed mb-4">
              Cross-Origin Resource Sharing (CORS) controls which domains can access the API from browser-based applications.
              In local mode, all origins are allowed. In cloud mode, you can configure allowed origins.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="display-heading text-xs text-[var(--foreground)] uppercase tracking-wider">Default CORS Policy</h3>
                <div className="overflow-x-auto border-2 border-[var(--border)]">
                  <table className="w-full text-left border-collapse text-step-0">
                    <thead>
                      <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                        <th className="p-2.5">Setting</th>
                        <th className="p-2.5">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                      {[
                        { s: 'Allow-Origin', v: '* (local) or configurable (cloud)' },
                        { s: 'Allow-Methods', v: 'GET, POST, PATCH, DELETE, OPTIONS' },
                        { s: 'Allow-Headers', v: 'Content-Type, Authorization, X-API-Key, X-Request-ID' },
                        { s: 'Expose-Headers', v: 'X-RateLimit-*, Retry-After' },
                        { s: 'Max-Age', v: '86400 (24 hours)' },
                      ].map((h) => (
                        <tr key={h.s} className="hover:bg-[var(--card-bg)]">
                          <td className="p-2.5 font-semibold text-[var(--foreground)]">Access-Control-{h.s}</td>
                          <td className="p-2.5 font-mono">{h.v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="display-heading text-xs text-[var(--foreground)] uppercase tracking-wider">Cloud Mode Configuration</h3>
                <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                  <div className="px-3 py-1.5 bg-[var(--card-bg)] border-b-2 border-[var(--border)] text-step-0 font-mono text-[var(--muted)] font-bold uppercase">Workspace Settings</div>
                  <CodeBlock code={`{
  "cors": {
    "allowed_origins": [
      "https://app.example.com",
      "https://admin.example.com"
    ],
    "allow_credentials": true
  }
}`} language="json" maxHeight="160px" />
                </div>
                <div className="text-step-0 font-mono text-[var(--muted)] leading-relaxed p-3 border-2 border-[var(--border)]">
                  In local mode, CORS is fully permissive (<code className="bg-[var(--code-bg)] px-1">Access-Control-Allow-Origin: *</code>) to support local development. This is safe because the API is only accessible from your device.
                </div>
              </div>
            </div>
          </div>
        </div>
        </RevealSection>

        {/* ── API Versioning ───────────────────────── */}
        <RevealSection>
        <div id="api-versioning" className="space-y-4 mb-6">
          <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] neo-depth space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-step-0 font-black tracking-widest uppercase font-mono neo-depth-btn mb-2">
              <GitBranch className="h-3.5 w-3.5" /> Versioning
            </div>
            <h2 className="display-heading text-lg text-[var(--foreground)] mb-1">API Versioning & Migration</h2>
            <p className="text-xs text-[var(--muted)] font-mono leading-relaxed mb-4">
              Gnovium follows semantic versioning with a minimum 6-month deprecation window for breaking changes.
              Two versioning methods are supported: URL-based (recommended) and header-based.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="display-heading text-xs text-[var(--foreground)] uppercase tracking-wider">Supported Versions</h3>
                <div className="overflow-x-auto border-2 border-[var(--border)]">
                  <table className="w-full text-left border-collapse text-step-0">
                    <thead>
                      <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                        <th className="p-2.5">Version</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Release</th>
                        <th className="p-2.5">EOL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                      {[
                        { v: 'v1', s: 'Current', r: 'Jun 2026', e: 'Dec 2027', current: true },
                        { v: 'v2', s: 'Beta', r: 'Q4 2026', e: 'Jun 2029', current: false },
                        { v: 'v3', s: 'Planned', r: 'Q2 2027', e: 'TBD', current: false },
                      ].map((row) => (
                        <tr key={row.v} className="hover:bg-[var(--card-bg)]">
                          <td className="p-2.5 font-bold text-[var(--foreground)]">{row.v}</td>
                          <td className="p-2.5">{row.current ? <span className="text-step-0 font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">{row.s}</span> : <span className="text-step-0 font-mono text-[var(--muted)]">{row.s}</span>}</td>
                          <td className="p-2.5">{row.r}</td>
                          <td className="p-2.5">{row.e}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="display-heading text-xs text-[var(--foreground)] uppercase tracking-wider">Versioning Methods</h3>
                <div className="space-y-3">
                  <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-3">
                    <div className="text-step-0 font-black font-mono uppercase tracking-wider text-[var(--foreground)] mb-1">URL-based (recommended)</div>
                    <code className="text-step-0 font-mono text-[var(--muted)]">/api/v1/entities/</code>
                    <p className="text-step-0 font-mono text-[var(--muted)] mt-1">Explicit, easy to read, preferred for new integrations.</p>
                  </div>
                  <div className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-3">
                    <div className="text-step-0 font-black font-mono uppercase tracking-wider text-[var(--foreground)] mb-1">Header-based</div>
                    <code className="text-step-0 font-mono text-[var(--muted)]">Accept: application/vnd.gnovium.v1+json</code>
                    <p className="text-step-0 font-mono text-[var(--muted)] mt-1">Cleaner URLs, requires client header management.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="display-heading text-xs text-[var(--foreground)] uppercase tracking-wider mb-3">Deprecation Timeline</h3>
              <div className="overflow-x-auto border-2 border-[var(--border)]">
                <table className="w-full text-left border-collapse text-step-0">
                  <thead>
                    <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--code-bg)] font-mono uppercase tracking-wider">
                      <th className="p-2.5">Feature</th>
                      <th className="p-2.5">Deprecated</th>
                      <th className="p-2.5">Removal</th>
                      <th className="p-2.5">Migration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                    {[
                      { f: 'v1 API path /api/v1/', d: 'v1.1.0', r: 'v3.0.0', m: 'Use /api/v2/ equivalents' },
                      { f: 'OAuth2 implicit grant', d: 'v1.1.0', r: 'v2.0.0', m: 'Use auth code + PKCE flow' },
                      { f: 'Plain-text content blocks', d: 'v1.0.0', r: 'v2.0.0', m: 'Use structured JSONB format' },
                      { f: 'Search mode "keyword" default', d: 'v0.9.0', r: 'v2.0.0', m: 'Use "hybrid" mode' },
                    ].map((row) => (
                      <tr key={row.f} className="hover:bg-[var(--card-bg)]">
                        <td className="p-2.5 font-semibold text-[var(--foreground)]">{row.f}</td>
                        <td className="p-2.5"><span className="text-step-0 font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">{row.d}</span></td>
                        <td className="p-2.5"><span className="text-step-0 font-black px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">{row.r}</span></td>
                        <td className="p-2.5 text-[var(--muted)]">{row.m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <a href={Routes.docs.changelog.build({})} className="text-step-0 font-black font-mono uppercase tracking-wider px-4 py-2 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" /> Full Changelog
              </a>
              <a href={Routes.docs.errorCatalog.build({})} className="text-step-0 font-black font-mono uppercase tracking-wider px-4 py-2 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Error Catalog
              </a>
            </div>
          </div>
        </div>
        </RevealSection>

        {/* ── Pinned Endpoints ────────────────────── */}
        <RevealSection>
        {pinnedEndpoints.size > 0 && (
          <div id="pinned-section" className="space-y-4" role="region" aria-label="Pinned endpoints">
            <div className="flex items-center gap-2 px-1">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <h2 className="display-heading text-sm text-[var(--foreground)] uppercase tracking-wider">Pinned</h2>
              <span className="text-step-0 font-mono text-[var(--muted)] ml-auto">{pinnedEndpoints.size} pinned</span>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
               animate="visible"
               className={`${viewMode === 'grid' ? 'grid gap-4' : 'space-y-4'}`}
               style={viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' } : undefined}
             >
               {ENDPOINTS.filter((ep) => pinnedEndpoints.has(ep.id)).map((endpoint) => {
                const isActive = endpoint.id === activeEndpointId;
                const currentTab = activeTabs[endpoint.id] || 'curl';
                const currentSnippet = getSnippet(endpoint, currentTab);
                const isViewed = viewedEndpoints.has(endpoint.id);
                let responseData: unknown = null;
                try { responseData = JSON.parse(endpoint.response); } catch {}

                return (
                  <motion.section
                    key={endpoint.id}
                    variants={cardVariants}
                    id={`pinned-${endpoint.id}`}
                    onClick={() => handleSelect(endpoint.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(endpoint.id); } }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                    className={`scroll-mt-24 p-4 sm:p-5 rounded-none border-2 transition-all duration-300 cursor-pointer border-amber-500/30 bg-amber-500/[0.02] ${
                      isActive ? 'neo-depth border-amber-500' : 'hover-glow'
                    } ${isViewed && !isActive ? 'border-l-4 border-l-amber-400' : ''}`}
                    aria-label={`${endpoint.method} ${endpoint.path}`}
                    role="button"
                    tabIndex={0}
                    whileHover={{ scale: 1.002, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getModuleIcon(endpoint.module)}
                        {methodBadge(endpoint.method)}
                        <span className="font-mono text-step-0 font-bold text-[var(--foreground)] truncate">{endpoint.path}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPinnedEndpoints((prev) => { const n = new Set(prev); n.delete(endpoint.id); return n; }); }}
                        className="p-1 border-2 border-amber-500/30 bg-amber-500/10 text-amber-400 cursor-pointer shrink-0"
                      >
                        <Star className="h-2.5 w-2.5 fill-amber-400" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-step-0 font-mono text-[var(--muted)] font-bold line-clamp-1">{endpoint.summary}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCard(endpoint.id); }}
                        className="text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer shrink-0"
                      >
                        {expandedCards.has(endpoint.id) ? 'Hide details' : 'Show details'}
                        {expandedCards.has(endpoint.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    </div>
                    <div className={`code-grid ${expandedCards.has(endpoint.id) ? 'open' : ''}`}>
                      <div>
                        <p className="text-step-0 font-mono text-[var(--muted)] font-bold mb-2">{endpoint.description}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelect(endpoint.id); }}
                          className="text-step-0 font-mono font-bold neo-depth-btn px-3 py-1.5 border-2 border-[var(--foreground)] cursor-pointer uppercase tracking-wider"
                        >
                          View full details
                        </button>
                      </div>
                    </div>
                  </motion.section>
                );
              })}
            </motion.div>
          </div>
        )}
        </RevealSection>

        {/* ── Endpoint Modules ──────────────────────── */}
        {Object.entries(modules).map(([moduleName, moduleEndpoints]) => (
          <RevealSection key={moduleName} id={`module-${moduleName}`} className="space-y-4" role="region" aria-label={`${moduleName} endpoints`}>
            <button
              onClick={() => toggleModule(moduleName)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleModule(moduleName); } }}
              className="w-full flex items-center gap-3 p-4 border-2 border-[var(--border)] cursor-pointer hover-glow module-header"
              style={{
                borderLeftColor: (() => { const c = getModuleColor(moduleName); return theme === 'dark' ? c.dark : c.light; })(),
                background: (() => { const c = getModuleColor(moduleName); return `${theme === 'dark' ? c.dark : c.light}08`; })(),
              }}
              aria-expanded={!(collapsedModules[moduleName] ?? true)}
            >
              {(collapsedModules[moduleName] ?? true) ? (
                <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
              )}
              {getModuleIcon(moduleName)}
              <h2 className="display-heading text-sm text-[var(--foreground)] uppercase tracking-wider">{moduleName}</h2>
              <span className="text-step-0 font-mono text-[var(--muted)] ml-auto">{moduleEndpoints.length} endpoints</span>
            </button>

            <AnimatePresence initial={false}>
              {!(collapsedModules[moduleName] ?? true) && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24, mass: 0.8 }}
                  className="overflow-hidden"
                >
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className={`${viewMode === 'grid' ? 'grid gap-4' : 'space-y-4'}`}
                    style={viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' } : undefined}
                   >
                   {moduleEndpoints.map((endpoint) => {
                  const isActive = endpoint.id === activeEndpointId;
                  const currentTab = activeTabs[endpoint.id] || 'curl';
                  const currentSnippet = getSnippet(endpoint, currentTab);
                  const isViewed = viewedEndpoints.has(endpoint.id);
                  let responseData: unknown = null;
                  try { responseData = JSON.parse(endpoint.response); } catch {}

                  return (
                    <motion.section
                      key={endpoint.id}
                      variants={cardVariants}
                      id={endpoint.id}
                      onClick={() => handleSelect(endpoint.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(endpoint.id); } }}
                      className={`scroll-mt-24 p-5 sm:p-6 rounded-none border-2 transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'border-[var(--foreground)] neo-depth'
                          : 'border-[var(--border)] neo-depth-zinc hover-glow'
                      } ${isViewed && !isActive ? 'border-l-4 border-l-emerald-500/40' : ''}`}
                      aria-label={`${endpoint.method} ${endpoint.path}`}
                      role="button"
                      tabIndex={0}
                      whileHover={{ scale: 1.002, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
                    >
                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {getModuleIcon(endpoint.module)}
                          {methodBadge(endpoint.method)}
                          <span className="font-mono text-xs sm:text-sm font-bold text-[var(--foreground)] tracking-tight break-all endpoint-path">
                            {endpoint.path}
                          </span>
                          <Tooltip content="Copy endpoint URL">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopy(`${API_BASE_URL}${endpoint.path}`, `${endpoint.id}-path`); }}
                              className="p-1 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                              aria-label="Copy endpoint path"
                            >
                              {copiedId === `${endpoint.id}-path` ? <Check className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
                            </button>
                          </Tooltip>
                          {/* Quick copy cURL button */}
                          <Tooltip content="Copy cURL snippet">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(getSnippet(endpoint, 'curl'), `${endpoint.id}-curl-quick`);
                              }}
                              className="p-1 border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                              aria-label="Quick copy cURL"
                            >
                              {copiedId === `${endpoint.id}-curl-quick` ? <Check className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
                            </button>
                          </Tooltip>
                          {/* Pin button */}
                          <Tooltip content={pinnedEndpoints.has(endpoint.id) ? 'Unpin endpoint' : 'Pin endpoint'}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPinnedEndpoints((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(endpoint.id)) next.delete(endpoint.id);
                                  else next.add(endpoint.id);
                                  return next;
                                });
                              }}
                              className={`p-1 border-2 cursor-pointer transition-colors ${
                                pinnedEndpoints.has(endpoint.id)
                                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                                  : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
                              }`}
                              aria-label={pinnedEndpoints.has(endpoint.id) ? 'Unpin endpoint' : 'Pin endpoint'}
                            >
                              <Star className={`h-3 w-3 ${pinnedEndpoints.has(endpoint.id) ? 'fill-amber-400' : ''}`} />
                            </button>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          {endpoint.availability === 'cloud-only' && (
                            <span className="cloud-only-badge">Cloud</span>
                          )}
                          <span className="text-step-0 text-[var(--muted)] font-black uppercase tracking-widest font-mono">{endpoint.module}</span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="display-heading text-base text-[var(--foreground)] uppercase tracking-tight">{endpoint.summary}</h3>
                          <p className="text-xs sm:text-sm text-[var(--muted)] font-bold leading-relaxed font-mono mt-1">{endpoint.description}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCard(endpoint.id); }}
                          className="text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer shrink-0 mt-1"
                        >
                          {expandedCards.has(endpoint.id) ? 'Hide details' : 'Show details'}
                          {expandedCards.has(endpoint.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      </div>

                      <div className={`code-grid ${expandedCards.has(endpoint.id) ? 'open' : ''}`}>
                      <div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {/* Left Column */}
                        <div className="space-y-5">
                          {/* Parameters */}
                          {endpoint.parameters && endpoint.parameters.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-step-0 font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 font-mono">
                                <Info className="h-3.5 w-3.5" /> Parameters
                              </h4>
                              <div className="overflow-x-auto border-2 border-[var(--border)]">
                                <table className="w-full text-left border-collapse text-step-0">
                                  <thead>
                                    <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black bg-[var(--card-bg)] font-mono uppercase tracking-wider">
                                      <th className="p-2.5">Name</th>
                                      <th className="p-2.5">Type</th>
                                      <th className="p-2.5 text-center">Req</th>
                                      <th className="p-2.5">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border)] text-[var(--muted)] font-mono">
                                    {endpoint.parameters.map((param, index) => (
                                      <tr key={index} className="hover:bg-[var(--card-bg)]">
                                        <td className="p-2.5 font-semibold text-[var(--foreground)]">
                                          <Tooltip content={`Type: ${param.type}${param.required ? ' · Required' : ' · Optional'}`}>
                                            <span>{param.name}</span>
                                          </Tooltip>
                                        </td>
                                        <td className="p-2.5 text-[var(--muted)]">{param.type}</td>
                                        <td className="p-2.5 text-center">
                                          {param.required ? (
                                            <span className="text-[9px] font-black px-2 py-0.5 bg-[var(--foreground)] text-[var(--background)] border-2 border-[var(--foreground)]">Yes</span>
                                          ) : (
                                            <span className="text-[9px] text-[var(--muted)] font-bold">No</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-[var(--muted)] leading-normal">
                                          <Tooltip content={param.description}>
                                            <span className="block truncate max-w-[200px]">{param.description}</span>
                                          </Tooltip>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Status Codes */}
                          <div className="space-y-2">
                            <h4 className="text-step-0 font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 font-mono">
                              <Terminal className="h-3.5 w-3.5" /> Response Status Codes
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {(STATUS_CODES[endpoint.method] || STATUS_CODES.GET).map((s) => (
                                <Tooltip key={s.code} content={`${s.code} ${s.description}`}>
                                  <span className={`text-step-0 font-mono font-bold px-2 py-0.5 border cursor-help ${
                                    Number(s.code) < 300 ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                                    Number(s.code) < 400 ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                    Number(s.code) < 500 ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                                    'border-rose-500/30 text-rose-400 bg-rose-500/10'
                                  }`}>
                                    <span className="font-black">{s.code}</span> {s.description}
                                  </span>
                                </Tooltip>
                              ))}
                            </div>
                          </div>

                          {/* Request Body */}
                          {endpoint.requestBody && (
                            <div className="space-y-2">
                              <h4 className="text-step-0 font-black uppercase tracking-widest text-[var(--muted)] font-mono">Request Body</h4>
                              <div className="relative border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopy(endpoint.requestBody || '', `${endpoint.id}-body`); }}
                                  className="absolute right-2 top-2 p-1.5 border border-[var(--border)] neo-depth-btn bg-[var(--card-bg)] text-[var(--foreground)] font-bold cursor-pointer z-10"
                                  aria-label="Copy request body"
                                >
                                  {copiedId === `${endpoint.id}-body` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                                <CodeBlock code={endpoint.requestBody} language="json" maxHeight="180px" />
                              </div>
                            </div>
                          )}

                          {/* Related endpoints */}
                          {(() => {
                            const related = ENDPOINTS.filter(
                              (ep) => ep.id !== endpoint.id && ep.module === endpoint.module && ep.method !== endpoint.method
                            ).slice(0, 3);
                            if (related.length === 0) return null;
                            return (
                              <div className="space-y-2">
                                <h4 className="text-step-0 font-black uppercase tracking-widest text-[var(--muted)] font-mono">Related Endpoints</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {related.map((r) => (
                                    <button
                                      key={r.id}
                                      onClick={(e) => { e.stopPropagation(); handleSelect(r.id); }}
                                      className="text-step-0 font-mono font-bold px-2 py-0.5 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] cursor-pointer transition-colors"
                                    >
                                      {r.method} {r.path}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* API Playground */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <ApiPlayground endpoint={endpoint} />
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                          {/* Snippet */}
                          <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                            <div className="flex items-center justify-between px-3 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
                              <div className="flex gap-1 font-mono">
                                {LANGS.map((tab, idx) => (
                                  <button
                                    key={tab}
                                    onClick={(e) => { e.stopPropagation(); setActiveTabs((prev) => ({ ...prev, [endpoint.id]: tab })); }}
                                    className={`py-2.5 px-3 text-step-0 uppercase font-black tracking-widest border-b-3 transition-all cursor-pointer ${
                                      currentTab === tab
                                        ? 'border-[var(--foreground)] text-[var(--foreground)] font-bold'
                                        : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                                    }`}
                                    aria-label={`Show ${tab} snippet`}
                                    title={`${tab} (⌘${idx + 1})`}
                                  >
                                    {tab === 'js' ? 'Fetch' : tab === 'typescript' ? 'TS' : tab}
                                    {tab === 'curl' && currentTab === 'curl' && <span className="ml-1 text-[8px] opacity-70">| python3</span>}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(currentSnippet, `${endpoint.id}-snip`); }}
                                className="p-1.5 border border-[var(--border)] neo-depth-btn bg-[var(--card-bg)] text-[var(--foreground)] font-bold cursor-pointer"
                                aria-label="Copy snippet"
                              >
                                {copiedId === `${endpoint.id}-snip` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <div className="endpoint-code"><CodeBlock code={currentSnippet} language={LANG_MAP[currentTab]} maxHeight="200px" /></div>
                          </div>

                          {/* Response JSON */}
                          <div className="border-2 border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 bg-[var(--card-bg)] border-b-2 border-[var(--border)]">
                              <span className="text-step-0 uppercase font-black tracking-widest text-[var(--muted)] font-mono flex items-center gap-1.5">
                                <Terminal className="h-3.5 w-3.5" /> Response JSON
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setResponseView(responseView === 'raw' ? 'tree' : 'raw'); }}
                                  className="p-1 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer text-[9px] font-black font-mono uppercase"
                                  aria-label={responseView === 'raw' ? 'Tree view' : 'Raw view'}
                                >
                                  {responseView === 'raw' ? <Code2 className="h-3 w-3" /> : <ListCollapse className="h-3 w-3" />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopy(endpoint.response, `${endpoint.id}-resp`); }}
                                  className="p-1 border border-[var(--border)] neo-depth-btn bg-[var(--card-bg)] text-[var(--foreground)] cursor-pointer"
                                  aria-label="Copy response"
                                >
                                  {copiedId === `${endpoint.id}-resp` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                            {responseView === 'raw' ? (
                              <CodeBlock code={endpoint.response} language="json" maxHeight="200px" />
                            ) : (
                              <div className="p-3 max-h-[200px] overflow-y-auto">
                                {responseData ? (
                                  <SchemaTree data={responseData} />
                                ) : (
                                  <span className="text-step-0 font-mono text-[var(--muted)]">Invalid JSON</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                      </div>
                    </motion.section>
                  );
                })}
                </motion.div>
              </motion.div>
              )}
            </AnimatePresence>
          </RevealSection>
        ))}

        {/* Empty state */}
        {Object.keys(modules).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-[var(--border)] p-8">
            <div className="w-16 h-16 border-4 border-[var(--border)] mb-4 flex items-center justify-center">
              <Search className="h-8 w-8 text-[var(--muted)]" strokeWidth={1.5} />
            </div>
            <h3 className="display-heading text-sm text-[var(--muted)] uppercase tracking-wider">No endpoints match your filters</h3>
            <p className="text-step-0 font-mono text-[var(--muted)] mt-2">Try adjusting your search or filter criteria</p>
            <button onClick={() => { setFilterMethod(null); setFilterModule(null); setSearchQuery(''); }} className="mt-6 text-xs font-mono font-bold neo-depth-btn px-4 py-2 border-2 border-[var(--foreground)] text-[var(--foreground)] cursor-pointer">
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile content — completely separate from desktop */}
      <div className="lg:hidden w-full">
        <MobileDocs
          endpoints={filteredEndpoints}
          modules={modules}
          recentlyViewed={recentlyViewed}
          activeEndpointId={activeEndpointId}
          viewedEndpoints={viewedEndpoints}
          pinnedEndpoints={pinnedEndpoints}
          onSelect={handleSelect}
          onCopy={handleCopy}
          copiedId={copiedId}
          getSnippet={getSnippet}
          methodBadge={methodBadge}
          theme={theme}
          activeTabs={activeTabs}
          setActiveTabs={(tabs) => setActiveTabs(tabs)}
          onTogglePin={(id) => {
            setPinnedEndpoints((prev) => {
              const n = new Set(prev);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            });
          }}
        />
      </div>

      {/* Jump to module - mobile */}
      <div className="lg:hidden fixed bottom-20 left-4 z-30">
        <select
          onChange={(e) => {
            if (e.target.value) {
              const el = document.getElementById(`module-${e.target.value}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="text-[9px] font-black font-mono uppercase tracking-wider px-3 py-2 border-2 border-[var(--foreground)] bg-[var(--card-bg)] shadow-[3px_3px_0px_var(--shadow-color)] text-[var(--foreground)] rounded-none cursor-pointer appearance-none"
          aria-label="Jump to module"
          defaultValue=""
        >
          <option value="" disabled>Jump to module</option>
          {Object.keys(modules).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="lg:hidden fixed bottom-32 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] shadow-[3px_3px_0px_0px_var(--shadow-color)] text-[var(--foreground)] cursor-pointer"
          >
            <ArrowDown className="h-4 w-4 rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile hamburger */}
      <div className="lg:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-6 z-30">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-none border-3 border-[var(--foreground)] bg-[var(--card-bg)] shadow-[6px_6px_0px_0px_var(--shadow-color)] text-[var(--foreground)] cursor-pointer"
          aria-label="Open navigation menu"
        >
          <ListCollapse className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-[var(--background)]/80 backdrop-blur-sm z-30"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 right-0 w-full max-w-xs bg-[var(--card-bg)] border-l-3 border-[var(--foreground)] p-6 z-40 overflow-y-auto scrollbar-thin flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-3">
                <span className="text-sm font-black text-[var(--foreground)] uppercase tracking-wider font-mono">Navigate Docs</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 border-2 border-[var(--border)] neo-depth-btn text-xs font-bold font-mono text-[var(--muted)] hover:text-[var(--foreground)] uppercase cursor-pointer">
                  Close
                </button>
              </div>

              <Sidebar
                endpoints={ENDPOINTS}
                activeId={activeEndpointId}
                onSelect={(id) => { handleSelect(id); setMobileMenuOpen(false); }}
                activeGuideId={activeGuideId}
                onGuideSelect={(id) => { handleGuideSelect(id); setMobileMenuOpen(false); }}
                viewedEndpoints={viewedEndpoints}
                zenMode={zenMode}
                onToggleZenMode={() => setZenMode(z => !z)}
              />

              <div className="mt-auto pt-8 border-t border-[var(--border)]">
                <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[var(--foreground)] flex flex-col gap-1.5">
                  <span className="opacity-60">CREATED &amp; BUILT BY</span>
                  <a href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417" target="_blank" rel="noopener noreferrer" className="font-bold border-b border-[var(--foreground)] pb-px inline-block hover:opacity-80 transition-opacity text-[11px]">
                    GAURAV KALOLIYA
                  </a>
                  <div className="flex items-center gap-2 text-[8px] tracking-[0.12em] pt-1">
                    <a href="https://github.com/GauravKaloliya/gnovium" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
                      GITHUB <ExternalLink className="h-2 w-2" />
                    </a>
                    <span className="opacity-30">•</span>
                    <a href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
                      LINKEDIN <ExternalLink className="h-2 w-2" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-32 lg:bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 border-2 border-[var(--foreground)] bg-[var(--card-bg)] shadow-[4px_4px_0px_var(--shadow-color)] text-xs font-mono font-bold"
          >
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}

export default function DocsPage() {
  return (
    <ErrorBoundary>
      <PageWrapper>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--foreground)] focus:text-[var(--background)] focus:text-sm focus:font-mono focus:font-bold"
        >
          Skip to main content
        </a>
        <Suspense fallback={
          <div className="space-y-4 p-8">
            <div className="skeleton h-12" />
            <div className="skeleton h-8 w-1/2" />
            <div className="skeleton h-64" />
            <div className="skeleton h-48" />
            <div className="skeleton h-48" />
          </div>
        }>
          <DocsContent />
          <Footer />
        </Suspense>
      </PageWrapper>
    </ErrorBoundary>
  );
}
