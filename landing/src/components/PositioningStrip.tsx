'use client';

import { motion } from 'framer-motion';
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

export default function PositioningStrip() {
  return (
    <section className="relative min-h-screen flex items-center py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
          className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6"
        >
          <div className="text-center mb-4">
            <span className="text-step-0 font-black font-mono uppercase tracking-widest text-[var(--muted)]">
              If you use Notion, Obsidian, or Logseq
            </span>
            <h3 className="text-step-3 font-black font-mono uppercase tracking-wider text-[var(--foreground)] mt-1">
              Here&apos;s what Gnovium adds
            </h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
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
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
