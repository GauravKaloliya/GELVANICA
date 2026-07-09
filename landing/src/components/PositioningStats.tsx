'use client';

import { motion } from 'framer-motion';
import {
  Braces, Route, Boxes, Palette, Server, Monitor,
} from 'lucide-react';
import { RevealSection } from './RevealSection';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 150, damping: 20 },
  },
};

const points = [
  'Version control for knowledge (branches, snapshots, diffs)',
  'Typed relations and backlinks between ideas',
  'AI-powered semantic search and Q&A',
  'Privacy-first local operation, no cloud required',
  'Governance dashboard with health scoring',
];

const stats = [
  { icon: Server, label: '111 Endpoints', sub: 'REST API' },
  { icon: Route, label: '80 Routes', sub: '22 Modules' },
  { icon: Boxes, label: '22 Modules', sub: 'Auth to Governance' },
  { icon: Palette, label: '6 Themes', sub: 'Light to Midnight' },
  { icon: Braces, label: 'OpenAPI Spec', sub: '3.0.3' },
  { icon: Monitor, label: '3 Platforms', sub: 'Desktop · Web · API' },
];

export default function PositioningStats() {
  return (
    <section className="relative min-h-screen flex items-center py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
          className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6"
        >
          <div className="text-center mb-8">
            <span className="text-step-0 font-black font-mono uppercase tracking-widest text-[var(--muted)]">
              If you use Notion, Obsidian, or Logseq
            </span>
            <h3 className="text-step-3 font-black font-mono uppercase tracking-wider text-[var(--foreground)] mt-1">
              Here&apos;s what Gnovium adds
            </h3>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 mb-8 pb-8 border-b-2 border-[var(--border)]">
            {points.map((p) => (
              <motion.div
                key={p}
                variants={cardVariants}
                className="px-3 py-1.5 border-2 border-[var(--border)] bg-[var(--code-bg)] text-step-0 font-mono font-bold text-[var(--foreground)]"
              >
                {p}
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={cardVariants}
                className="flex flex-col items-center justify-center gap-1.5 py-2 px-3 text-center"
              >
                <s.icon className="h-4 w-4 text-[var(--accent-secondary)]" strokeWidth={2.5} />
                <span className="text-step-2 font-black font-mono text-[var(--foreground)] tracking-tight">
                  {s.label}
                </span>
                <span className="text-step-0 font-mono font-bold text-[var(--muted)] uppercase tracking-widest">
                  {s.sub}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
