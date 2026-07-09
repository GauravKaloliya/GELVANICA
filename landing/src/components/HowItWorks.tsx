'use client';

import { motion } from 'framer-motion';
import {
  PenSquare, Link2, Network, MessageSquare, GitBranch, GitCompare, LineChart, Users,
} from 'lucide-react';
import ParticleGraph from './ParticleGraph';
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

const steps = [
  {
    icon: PenSquare,
    step: '01',
    title: 'Create Knowledge',
    desc: 'Write in blocks, not documents. Rich text, code, tables, images — every page is a flexible canvas of modular content.',
  },
  {
    icon: Link2,
    step: '02',
    title: 'Connect Ideas',
    desc: 'Link pages with meaningful relationships, add tags, and define custom properties. Your knowledge grows from isolated notes into a connected web.',
  },
  {
    icon: Network,
    step: '03',
    title: 'Explore Visually',
    desc: 'Open the graph view to see your knowledge as a living network. Discover hidden connections and navigate relationships visually.',
  },
  {
    icon: MessageSquare,
    step: '04',
    title: 'Ask Anything',
    desc: 'Use AI to search semantically, ask questions in plain language, summarize pages, and discover related content you never knew existed.',
  },
  {
    icon: GitBranch,
    step: '05',
    title: 'Experiment Safely',
    desc: 'Branch your workspace, make bold changes, and take snapshots along the way. If something breaks, roll back instantly.',
  },
  {
    icon: GitCompare,
    step: '06',
    title: 'Compare & Merge',
    desc: 'See exactly what changed across branches — green for additions, red for removals. Merge when you\'re confident.',
  },
  {
    icon: LineChart,
    step: '07',
    title: 'Keep It Healthy',
    desc: 'Governance dashboard detects duplicates, orphans, and stale content. A health score keeps your workspace clean and organized.',
  },
  {
    icon: Users,
    step: '08',
    title: 'Share & Collaborate',
    desc: 'Invite your team, share branches, and work together in real time. Cloud sync keeps everyone on the same page — literally.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <ParticleGraph className="opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-14 text-center">
          <h2 className="display-heading mb-4">
            How it <span className="text-[var(--accent-secondary)]">works</span>
          </h2>
          <p className="mx-auto max-w-2xl text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
            Eight steps from capturing ideas to collaborating with your team.
            All powered by the same block-based engine, relational graph, and AI.
          </p>
        </div>

        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={cardVariants}
              whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
              className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-5 neo-depth flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3 border-b-2 border-[var(--border)] pb-3">
                <span className="text-step-0 font-black font-mono text-[var(--muted)] tracking-widest">
                  {s.step}
                </span>
                <s.icon className="h-4 w-4 text-[var(--accent-secondary)] shrink-0" strokeWidth={2.5} />
                <h3 className="text-step-1 font-black font-mono uppercase tracking-wider text-[var(--foreground)]">
                  {s.title}
                </h3>
              </div>
              <p className="text-step-0 text-[var(--muted)] leading-relaxed font-mono font-bold flex-1">
                {s.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
          className="mt-8 border-2 border-[var(--border)] bg-[var(--card-bg)] p-4 text-center"
        >
          <p className="text-step-0 font-mono font-bold text-[var(--muted)]">
            From first block to healthy workspace — everything works offline, in local mode, by default.
          </p>
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
