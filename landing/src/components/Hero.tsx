'use client';

import { motion } from 'framer-motion';
import { HardDrive, Sparkles } from 'lucide-react';
import ParticleGraph from './ParticleGraph';
import Link from 'next/link';
import { Routes, frontendUrl } from '@gnovium/shared';

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      <ParticleGraph className="opacity-50" />

      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(135deg, var(--foreground) 0%, transparent 50%, var(--foreground) 100%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 4s ease-in-out infinite',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10 w-full py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
          {/* ── Left column ─────────────────────────── */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 14 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-step-0 font-black tracking-widest uppercase font-mono w-fit"
            >
              <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
              LOCAL-FIRST · FREE · OPEN SOURCE
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 16 }}
              className="display-heading mb-6"
            >
              Knowledge OS for{' '}
              <span className="text-[var(--accent-secondary)]">humans</span>{' '}
              & machines
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 16 }}
              className="mb-6 max-w-xl text-step-2 text-[var(--muted)] leading-relaxed font-mono font-bold"
            >
              Blocks instead of documents. Relations instead of folders. A graph instead of a file tree.
              Your data stays yours. AI runs locally. Free, always.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 16 }}
              className="flex flex-wrap items-center gap-3 mb-0"
            >
              <Link
                href={Routes.landing.download.build({})}
                className="text-step-1 font-black font-mono uppercase tracking-wider px-6 py-3 border-2 border-[var(--foreground)] neo-depth-btn text-[var(--foreground)] bg-[var(--card-bg)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-2"
              >
                <HardDrive className="h-4 w-4" />
                Download Gnovium
              </Link>
              <Link
                href={frontendUrl()}
                className="text-step-1 font-black font-mono uppercase tracking-wider px-6 py-3 border-2 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-2 bg-[var(--card-bg)]"
              >
                Get Started
                <Sparkles className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>

          {/* ── Right column ────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Mode cards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 100, damping: 16 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="border-2 border-emerald-500/30 bg-emerald-500/5 p-4">
                <h4 className="text-step-0 font-black font-mono uppercase tracking-widest text-emerald-400 mb-2">
                  Local Mode
                </h4>
                <p className="text-step-0 font-mono font-bold text-[var(--muted)] leading-relaxed">
                  Works offline · private by default · zero setup · your data never leaves
                </p>
              </div>
              <div className="border-2 border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/5 p-4">
                <h4 className="text-step-0 font-black font-mono uppercase tracking-widest text-[var(--accent-secondary)] mb-2">
                  Cloud Mode
                </h4>
                <p className="text-step-0 font-mono font-bold text-[var(--muted)] leading-relaxed">
                  Team collaboration · access anywhere · automatic backups · scales when you need
                </p>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 16 }}
              className="text-step-0 text-[var(--muted)] font-mono font-bold leading-relaxed text-center border-b-2 border-[var(--border)] pb-3"
              style={{ opacity: 0.6 }}
            >
              Same features. Same workflow. No lock-in. Start local, go cloud when ready.
            </motion.p>

            {/* Three problems */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 100, damping: 16 }}
              className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-4"
            >
              {[
                ['Knowledge Fragmented', 'Scattered across documents, apps, and folders. Context lost between tools.'],
                ['Relationships Hidden', 'Ideas are connected but traditional tools hide those connections.'],
                ['No Safety Net', 'Changes are permanent. No branches, no undo, no way to experiment safely.'],
              ].map(([problem, desc]) => (
                <div key={problem} className="py-2.5 not-last:border-b-2 not-last:border-[var(--border)]">
                  <h4 className="text-step-0 font-black font-mono uppercase tracking-widest text-[var(--foreground)] mb-0.5">
                    {problem}
                  </h4>
                  <p className="text-step-0 font-mono font-bold text-[var(--muted)] leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
