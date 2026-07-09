'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, MotionConfig, type Variants } from 'framer-motion';
import {
  Download, Apple, Monitor, Check, ExternalLink,
  ChevronDown, Star, Globe, Terminal, Shield,
  Zap, Layers, HardDrive, Cpu, GitBranch,
} from 'lucide-react';
import { Routes, docsUrl } from '../lib';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

type Platform = 'mac-arm' | 'mac-intel' | 'windows' | null;

interface DownloadOption {
  id: Platform;
  label: string;
  arch: string;
  icon: 'apple' | 'intel' | 'windows';
  fileSize: string;
  version: string;
  downloadUrl: string;
  detected: boolean;
}

const DOWNLOADS: DownloadOption[] = [
  {
    id: 'mac-arm',
    label: 'macOS Apple Silicon',
    arch: 'M1 · M2 · M3 · M4',
    icon: 'apple',
    fileSize: '98 MB',
    version: '1.0.2',
    downloadUrl: '#',
    detected: false,
  },
  {
    id: 'mac-intel',
    label: 'macOS Intel',
    arch: 'Intel-based Mac',
    icon: 'intel',
    fileSize: '102 MB',
    version: '1.0.2',
    downloadUrl: '#',
    detected: false,
  },
  {
    id: 'windows',
    label: 'Windows',
    arch: 'Windows 10 · 11',
    icon: 'windows',
    fileSize: '112 MB',
    version: '1.0.2',
    downloadUrl: '#',
    detected: false,
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Local-First Architecture',
    description: 'Your data never leaves your machine unless you choose to sync. Full offline capability with real-time responsiveness.',
  },
  {
    icon: Globe,
    title: 'Cloud Sync Ready',
    description: 'Seamless sync with Gnovium Cloud when you need it. Collaborate with teams or access your knowledge from anywhere.',
  },
  {
    icon: Terminal,
    title: 'Graph-Powered API',
    description: 'Built-in API server with 111 endpoints. Build applications on top of your knowledge graph directly from the desktop app.',
  },
  {
    icon: Shield,
    title: 'End-to-End Encryption',
    description: 'Your knowledge is encrypted at rest and in transit. Zero-knowledge architecture ensures only you can read your data.',
  },
  {
    icon: Layers,
    title: 'Git-Inspired Versioning',
    description: 'Every change is tracked. Branch, merge, diff, and roll back your knowledge base with the same confidence as source code.',
  },
  {
    icon: Cpu,
    title: 'AI-Native Intelligence',
    description: 'Semantic search, natural language queries, and AI-powered insights run locally on your machine. No cloud dependency.',
  },
];

const REQUIREMENTS = [
  { label: 'Operating System', value: 'macOS 13+ · Windows 10+' },
  { label: 'Processor', value: 'Intel Core i5 / Apple Silicon · AMD Ryzen 5' },
  { label: 'Memory', value: '8 GB RAM (16 GB recommended)' },
  { label: 'Storage', value: '500 MB available space' },
  { label: 'Network', value: 'Optional for cloud sync features' },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 150, damping: 20 },
  },
};

function PlatformIcon({ icon, className }: { icon: 'apple' | 'intel' | 'windows'; className?: string }) {
  if (icon === 'apple') return <Apple className={className || 'h-5 w-5'} strokeWidth={1.5} />;
  if (icon === 'windows') return <Monitor className={className || 'h-5 w-5'} strokeWidth={1.5} />;
  return (
    <svg className={className || 'h-5 w-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
      <path d="M4 9h16" />
      <path d="M4 15h16" />
    </svg>
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

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function DownloadContent({ changelogHref = docsUrl(Routes.docs.changelog.build({})) }: { changelogHref?: string }) {
  const reducedMotion = useReducedMotion();
  const [detectedOs, setDetectedOs] = useState<Platform>(null);
  const [selectedDownload, setSelectedDownload] = useState<Platform>(null);
  const [downloading, setDownloading] = useState<Platform>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const pf = (navigator.platform || '').toLowerCase();
    const isMac = /mac/.test(ua);
    const isWin = /win/.test(ua);

    let isArm = pf === 'macarm64' || pf.includes('arm');

    if (!isArm) {
      try {
        const uaData = (navigator as any).userAgentData;
        if (uaData?.architecture === 'arm') isArm = true;
      } catch {}
    }

    if (!isArm) {
      const match = ua.match(/\(([^)]+)\)/);
      if (match && /arm64|aarch64/.test(match[1])) isArm = true;
    }

    if (isMac) setDetectedOs('mac-arm');
    else if (isWin) setDetectedOs('windows');
    else setDetectedOs('mac-arm');

    DOWNLOADS.forEach((d) => {
      d.detected = false;
      if (d.id === 'mac-arm' && isMac) d.detected = true;
      else if (d.id === 'windows' && isWin) d.detected = true;
    });
  }, []);

  const handleDownload = (id: Platform) => {
    setSelectedDownload(id);
    setDownloading(id);
    setTimeout(() => setDownloading(null), 2500);
  };

  const detectedDownload = DOWNLOADS.find((d) => d.detected);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
    <div className="max-w-5xl mx-auto space-y-10">
      {/* ── Hero ─────────────────────────────────── */}
      <RevealSection>
        <div className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] hero-depth flex flex-col md:flex-row items-center justify-between gap-8 mb-2 overflow-hidden relative min-h-[300px]">
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
              VERSION 1.0.2 · APP VERSION
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 16 }}
              className="display-heading text-[var(--foreground)] uppercase"
            >
              Download Gnovium
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
              Run the entire Gnovium platform on your machine — no cloud account required.
              Your knowledge graph, your AI, your rules. Download once, own forever.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 100, damping: 16 }}
              className="flex gap-6 pt-1"
            >
              <AnimatedCounter value={10000} label="Downloads" />
              <AnimatedCounter value={3} label="Platforms" />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 16 }}
                className="flex flex-col items-center"
              >
                <motion.span
                  className="text-2xl font-black font-mono text-[var(--foreground)]"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  v1.0.2
                </motion.span>
                <span className="text-[9px] font-black font-mono uppercase tracking-widest text-[var(--muted)]">
                  App Version
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 16 }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <a
                href={detectedDownload?.downloadUrl || '#'}
                onClick={(e) => { if (!detectedDownload) e.preventDefault(); else handleDownload(detectedDownload.id); }}
                className="text-xs font-black font-mono uppercase tracking-wider px-6 py-3 border-2 border-[var(--foreground)] neo-depth-btn bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                {detectedDownload ? `Download for ${detectedDownload.label}` : 'Choose your platform'}
              </a>
              <span className="text-[9px] font-mono text-[var(--muted)] tracking-wider">
                {detectedDownload?.fileSize || '98–112 MB'} · v{detectedDownload?.version || '1.0.2'}
              </span>
            </motion.div>
          </div>

          {/* Illustration */}
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
              <rect x="40" y="70" width="80" height="65" rx="12" stroke="var(--foreground)" strokeWidth="3" fill="var(--card-bg)" />
              <circle cx="65" cy="100" r="6" fill="var(--foreground)" />
              <circle cx="95" cy="100" r="6" fill="var(--foreground)" />
              <path d="M68 118 Q80 128 92 118" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="55" cy="108" r="5" fill="var(--accent)" opacity="0.3" />
              <circle cx="105" cy="108" r="5" fill="var(--accent)" opacity="0.3" />
              <line x1="80" y1="70" x2="80" y2="50" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
              <motion.circle
                cx="80" cy="45" r="6"
                stroke="var(--foreground)" strokeWidth="2.5"
                fill="var(--accent)"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <rect x="32" y="85" width="10" height="15" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
              <rect x="118" y="85" width="10" height="15" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
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
              <rect x="48" y="128" width="18" height="10" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
              <rect x="94" y="128" width="18" height="10" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
              <motion.path
                d="M130 35 C130 30 125 25 120 25 C114 25 110 30 110 35 C110 42 120 48 120 48 C120 48 130 42 130 35Z"
                stroke="var(--foreground)" strokeWidth="2"
                fill="var(--accent)" opacity="0.6"
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              />
              <motion.text x="15" y="38" fontSize="14" fill="var(--foreground)" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>✦</motion.text>
              <motion.text x="140" y="60" fontSize="10" fill="var(--foreground)" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>✦</motion.text>
            </motion.svg>
          </motion.div>
        </div>
      </RevealSection>

      {/* ── OS Detection Banner ─────────────────── */}
      <RevealSection>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 18 }}
          className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center bg-[var(--code-bg)]">
              {detectedOs === 'windows' ? (
                <Monitor className="h-5 w-5 text-[var(--foreground)]" strokeWidth={2} />
              ) : (
                <Apple className="h-5 w-5 text-[var(--foreground)]" strokeWidth={2} />
              )}
            </div>
            <div>
              <div className="text-step-0 font-black font-mono uppercase tracking-wider text-[var(--muted)]">
                {detectedOs ? 'System Detected' : 'Detecting your system...'}
              </div>
              <div className="text-sm font-black font-mono text-[var(--foreground)]">
                {detectedOs === 'windows' ? 'Windows' : detectedOs ? 'macOS · Apple Silicon' : '—'}
              </div>
            </div>
          </div>
          <div className="flex-1" />
          {detectedDownload && (
            <a
              href={detectedDownload.downloadUrl}
              onClick={(e) => { e.preventDefault(); handleDownload(detectedDownload.id); }}
              className="text-step-0 font-black font-mono uppercase tracking-wider px-4 py-2 border-2 border-[var(--foreground)] neo-depth-btn bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all flex items-center gap-2 shrink-0"
            >
              <Download className="h-3.5 w-3.5 stroke-[2.5]" />
              {downloading === detectedDownload.id ? 'Downloading...' : `Download ${detectedDownload.fileSize}`}
            </a>
          )}
        </motion.div>
      </RevealSection>

      {/* ── Version Card ────────────────────────── */}
      <RevealSection>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 16 }}
          className="border-[3px] border-[var(--foreground)] p-6 bg-[var(--card-bg)] neo-depth-zinc text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, var(--foreground) 0%, transparent 70%)',
          }} />
          <div className="relative z-10 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 14 }}
              className="inline-flex items-center gap-2 px-3 py-1 border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[9px] font-black font-mono uppercase tracking-widest mx-auto"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse" />
              Current Release
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 100, damping: 14 }}
            >
              <motion.span
                className="text-5xl sm:text-6xl font-black font-mono text-[var(--foreground)] tracking-tight inline-block"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                v1.0.2
              </motion.span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-3 pt-1"
            >
              <span className="text-[9px] font-mono font-bold text-[var(--muted)] px-3 py-1.5 border border-[var(--border)] bg-[var(--code-bg)] flex items-center gap-1.5">
                <Layers className="h-2.5 w-2.5" />
                Build 2026.06
              </span>
              <span className="text-[9px] font-mono font-bold text-[var(--muted)] px-3 py-1.5 border border-[var(--border)] bg-[var(--code-bg)] flex items-center gap-1.5">
                <Terminal className="h-2.5 w-2.5" />
                111 Endpoints
              </span>
              <span className="text-[9px] font-mono font-bold text-[var(--muted)] px-3 py-1.5 border border-[var(--border)] bg-[var(--code-bg)] flex items-center gap-1.5">
                <Globe className="h-2.5 w-2.5" />
                24 Modules
              </span>
              <a
                href={changelogHref}
                className="text-[9px] font-black font-mono uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--foreground)] neo-depth-btn hover:opacity-80 transition-all flex items-center gap-1.5 bg-[var(--foreground)] text-[var(--background)]"
              >
                Changelog <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </RevealSection>

      {/* ── Download Cards ───────────────────────── */}
      <RevealSection>
        <div className="space-y-4">
          <h2 className="display-heading text-2xl text-[var(--foreground)] uppercase tracking-tight">
            Choose Your Platform
          </h2>
          <p className="text-step-1 font-mono text-[var(--muted)] font-bold">
            Select the version that matches your operating system. All builds are signed and verified.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DOWNLOADS.map((dl, i) => (
              <motion.div
                key={dl.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 130, damping: 18 }}
                className={`relative border-[3px] p-5 flex flex-col transition-all duration-200 ${
                  dl.detected
                    ? 'border-emerald-500/60 bg-emerald-500/[0.04] neo-depth'
                    : selectedDownload === dl.id
                    ? 'border-[var(--foreground)] bg-[var(--card-bg)] neo-depth-btn'
                    : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--foreground)] hover:translate-y-[-2px]'
                }`}
              >
                {dl.detected && (
                  <div className="absolute -top-[13px] right-3 z-10 px-2.5 py-0.5 border-2 border-emerald-500 bg-emerald-500 text-[var(--background)] text-[9px] font-black font-mono uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                    <Check className="h-3 w-3 stroke-[3]" />
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 border-2 flex items-center justify-center ${
                    dl.detected ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--code-bg)]'
                  }`}>
                    <PlatformIcon icon={dl.icon} className={`h-5 w-5 ${dl.detected ? 'text-emerald-400' : 'text-[var(--foreground)]'}`} />
                  </div>
                  <div>
                    <div className="text-step-0 font-black font-mono text-[var(--foreground)]">{dl.label}</div>
                    <div className="text-[9px] font-mono text-[var(--muted)] font-bold">{dl.arch}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[9px] font-mono text-[var(--muted)] mb-5">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-2.5 w-2.5" />
                    {dl.fileSize}
                  </span>
                  <span className="w-px h-3 bg-[var(--border)]" />
                  <span className="flex items-center gap-1">
                    <Layers className="h-2.5 w-2.5" />
                    v{dl.version}
                  </span>
                  <span className="w-px h-3 bg-[var(--border)]" />
                  <span className="flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />
                    Signed
                  </span>
                </div>

                <div className="mt-auto">
                  <a
                    href={dl.downloadUrl}
                    onClick={(e) => { e.preventDefault(); handleDownload(dl.id); }}
                    className={`w-full text-step-0 font-black font-mono uppercase tracking-wider px-4 py-3 border-2 transition-all flex items-center justify-center gap-2 ${
                      dl.detected
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 neo-depth-btn'
                        : 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 neo-depth-btn'
                    }`}
                  >
                    {downloading === dl.id ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                        </motion.div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                        Download {dl.fileSize}
                      </>
                    )}
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ── All Platforms ─────────────────────── */}
      <RevealSection>
        <div className="border-2 border-[var(--border)] p-4 bg-[var(--card-bg)]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-step-0 font-black font-mono uppercase tracking-widest text-[var(--muted)]">Also available on</span>
            <div className="flex flex-wrap gap-2">
              <span className="text-step-0 font-mono font-bold px-3 py-1.5 border-2 border-[var(--border)] text-[var(--foreground)] bg-[var(--code-bg)] flex items-center gap-1.5">
                <Apple className="h-3 w-3" /> macOS 13+
              </span>
              <span className="text-step-0 font-mono font-bold px-3 py-1.5 border-2 border-[var(--border)] text-[var(--foreground)] bg-[var(--code-bg)] flex items-center gap-1.5">
                <Monitor className="h-3 w-3" /> Windows 10+
              </span>
              <a
                href="https://github.com/GauravKaloliya/gnovium"
                target="_blank"
                rel="noopener noreferrer"
                className="text-step-0 font-mono font-bold px-3 py-1.5 border-2 border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-all flex items-center gap-1.5 bg-[var(--code-bg)]"
              >
                <GitBranch className="h-3 w-3" /> Build from Source
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ── Features ──────────────────────────── */}
      <RevealSection>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="display-heading text-2xl text-[var(--foreground)] uppercase tracking-tight">
              Why Run Gnovium Desktop?
            </h2>
            <p className="text-step-1 font-mono text-[var(--muted)] font-bold max-w-xl mx-auto">
              The desktop app gives you the full power of the Knowledge OS — no compromises, no subscriptions.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className="border-2 border-[var(--border)] p-5 bg-[var(--card-bg)] hover:border-[var(--foreground)] transition-all duration-200 hover:translate-y-[-2px] card-hover"
              >
                <div className="w-9 h-9 border-2 border-[var(--border)] flex items-center justify-center mb-3 bg-[var(--code-bg)]">
                  <feature.icon className="h-4 w-4 text-[var(--foreground)]" strokeWidth={2} />
                </div>
                <h3 className="text-step-0 font-black font-mono uppercase tracking-wider text-[var(--foreground)] mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-step-1 font-mono text-[var(--muted)] leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </RevealSection>

      {/* ── System Requirements ───────────────── */}
      <RevealSection>
        <div className="space-y-4">
          <h2 className="display-heading text-2xl text-[var(--foreground)] uppercase tracking-tight">
            System Requirements
          </h2>
          <div className="border-2 border-[var(--border)] overflow-hidden">
            {REQUIREMENTS.map((req, i) => (
              <div
                key={req.label}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i < REQUIREMENTS.length - 1 ? 'border-b border-[var(--border)]' : ''
                }`}
              >
                <span className="text-step-0 font-black font-mono uppercase tracking-wider text-[var(--muted)]">
                  {req.label}
                </span>
                <span className="text-step-0 font-mono font-bold text-[var(--foreground)] text-right max-w-[60%]">
                  {req.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ── CTA ─────────────────────────────────── */}
      <RevealSection>
        <div className="border-[3px] border-[var(--foreground)] p-6 text-center space-y-4 bg-[var(--card-bg)] neo-depth-zinc">
          <h2 className="display-heading text-xl text-[var(--foreground)] uppercase tracking-tight">
            Ready to Build?
          </h2>
          <p className="text-step-0 font-mono text-[var(--muted)] font-bold max-w-md mx-auto">
            Download Gnovium Desktop and start building your knowledge operating system in minutes.
            No sign-up required. No credit card. Just pure, local-first knowledge management.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {DOWNLOADS.map((dl) => (
              <a
                key={dl.id}
                href={dl.downloadUrl}
                onClick={(e) => { e.preventDefault(); handleDownload(dl.id); }}
                className={`text-step-0 font-black font-mono uppercase tracking-wider px-4 py-2.5 border-2 transition-all flex items-center gap-2 ${
                  dl.detected
                    ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] neo-depth-btn hover:opacity-90'
                    : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] bg-[var(--code-bg)]'
                }`}
              >
                <PlatformIcon icon={dl.icon} className="h-3.5 w-3.5" />
                {dl.label}
              </a>
            ))}
          </div>
          <div className="pt-2">
            <a
              href={changelogHref}
              className="text-step-0 font-mono font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1"
            >
              View full changelog <ChevronDown className="h-3 w-3" />
            </a>
          </div>
        </div>
      </RevealSection>
    </div>
    </MotionConfig>
  );
}
