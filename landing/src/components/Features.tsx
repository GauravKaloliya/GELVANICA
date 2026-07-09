'use client';

import { motion } from 'framer-motion';
import {
  Blocks, Link2, GitFork, Brain,
  Network, Workflow,
} from 'lucide-react';
import ParticleGraph from './ParticleGraph';
import { RevealSection } from './RevealSection';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
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

const features = [
  {
    icon: Blocks,
    title: 'Block-Based Workspace',
    desc: 'Modular content that nests, reorders, and composes into any structure. Text, headings, lists, code, tables, callouts — every page is a flexible canvas of blocks.',
  },
  {
    icon: Link2,
    title: 'Relational Knowledge',
    desc: 'Connect your ideas with meaningful relationships. Every page shows you who links to it, what it depends on, and how it fits into your bigger picture.',
  },
  {
    icon: Network,
    title: 'Visual Knowledge Graph',
    desc: 'See your knowledge come alive as an interactive network. Explore connections, discover hidden relationships, and navigate your information visually.',
  },
  {
    icon: GitFork,
    title: 'Versioning & Branches',
    desc: 'Experiment without fear. Branch your workspace, make bold changes, snapshot any state, and roll back whenever you need. Like Git, but for your knowledge.',
  },
  {
    icon: Brain,
    title: 'AI Workspace Assistant',
    desc: 'Ask questions in plain language, get answers grounded in your own knowledge. Semantic search, summarization, and smart recommendations — all running locally.',
  },
  {
    icon: Workflow,
    title: 'Local-First, Cloud-Ready',
    desc: 'Stays on your machine by default. Works offline, respects your privacy, requires no sign-up. Opt into cloud features when you need to collaborate or sync across devices.',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <ParticleGraph className="opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-16 text-center">
          <h2 className="display-heading mb-4">
            Everything a{' '}
            <span className="text-[var(--accent-secondary)]">knowledge system</span>{' '}
            should be
          </h2>
          <p className="mx-auto max-w-2xl text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
            Gnovium solves three problems: knowledge scattered everywhere, context lost between notes,
            and no safe way to experiment with your ideas.
          </p>
        </div>

          <RevealSection>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={cardVariants}
              whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
              className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4 border-b-2 border-[var(--border)] pb-3">
                <f.icon size={18} strokeWidth={2.5} />
                <h3 className="text-step-3 font-black font-mono uppercase tracking-wider text-[var(--foreground)]">
                  {f.title}
                </h3>
              </div>
              <p className="text-step-0 text-[var(--muted)] leading-relaxed font-mono font-bold flex-1">
                {f.desc}
              </p>
            </motion.div>
          ))}
          </motion.div>
          </RevealSection>
        </div>
    </section>
  );
}
