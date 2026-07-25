'use client';

import { motion } from 'framer-motion';
import {
  Cpu, MessageSquare, Search, Sparkles, Bot, Workflow,
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

const capabilities = [
  {
    icon: Search,
    title: 'Semantic Search',
    desc: 'Search by meaning, not just keywords. Find relevant content even when you don\'t remember the exact words. Hybrid search combines keyword matching with AI-powered understanding.',
  },
  {
    icon: MessageSquare,
    title: 'Natural Language Q&A',
    desc: 'Ask questions in plain English and get answers grounded in your actual knowledge. No prompt engineering required — just ask like you would a teammate.',
  },
  {
    icon: Sparkles,
    title: 'Smart Summarization',
    desc: 'Generate concise summaries of pages, collections, or entire workspaces. Get the gist without reading everything.',
  },
  {
    icon: Bot,
    title: 'Multi-Agent Assistance',
    desc: 'A team of AI agents works together on your behalf — one searches, one analyzes, one suggests improvements. All coordinated by a supervisor agent that knows your workspace.',
  },
  {
    icon: Workflow,
    title: 'Graph-Aware Discovery',
    desc: 'AI that understands connections. Recommendations factor in not just what you searched for, but how it relates to everything else in your knowledge graph.',
  },
  {
    icon: Cpu,
    title: 'Local Inference Runtime',
    desc: 'A custom-built GPU-native AI engine runs on your machine. No data sent to external APIs, no cloud dependency, no privacy trade-offs. Mode-aware: local GPU or cloud inference.',
  },
];

export default function AISection() {
  return (
    <section id="ai" aria-label="AI Capabilities" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <ParticleGraph className="opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-step-0 font-black tracking-widest uppercase font-mono">
            <Cpu className="h-3 w-3" />
            CUSTOM AI ENGINE · LOCAL BY DEFAULT
          </div>
          <h2 className="display-heading mb-4">
            AI that runs on <span className="text-[var(--accent-secondary)]">your machine</span>
          </h2>
          <p className="mx-auto max-w-2xl text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
            Gnovium ships with a custom-built GPU-native inference runtime. Not a wrapper around an external API.
            A real AI engine that runs locally, understands your knowledge graph, and works offline.
          </p>
        </div>

        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="list"
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {capabilities.map((c) => (
            <motion.div
              key={c.title}
              role="listitem"
              aria-label={c.title}
              variants={cardVariants}
              whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
              className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4 border-b-2 border-[var(--border)] pb-3">
                <c.icon size={18} strokeWidth={2.5} />
                <h3 className="text-step-3 font-black font-mono uppercase tracking-wider text-[var(--foreground)]">
                  {c.title}
                </h3>
              </div>
              <p className="text-step-0 text-[var(--muted)] leading-relaxed font-mono font-bold flex-1">
                {c.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom banner */}
        <motion.div
          variants={cardVariants}
          whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
          className="mt-8 border-2 border-[var(--border)] bg-[var(--card-bg)] p-5 text-center"
        >
          <p className="text-step-0 font-mono font-bold text-[var(--muted)]">
            All AI capabilities work in Local Mode by default. No cloud account. No API keys. No data sent anywhere.
          </p>
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
