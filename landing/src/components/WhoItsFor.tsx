'use client';

import { motion } from 'framer-motion';
import { GraduationCap, FlaskConical, Briefcase, Rocket } from 'lucide-react';
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

const audiences = [
  {
    icon: GraduationCap,
    title: 'Students',
    desc: 'Organize research, connect course materials, build study knowledge graphs, and experiment with ideas safely using branches.',
  },
  {
    icon: FlaskConical,
    title: 'Researchers',
    desc: 'Build literature knowledge bases, track paper relationships, use AI to find connections across domains you never spotted.',
  },
  {
    icon: Briefcase,
    title: 'Knowledge Workers',
    desc: 'Replace scattered docs and folders with a connected knowledge system. Find information faster, reduce context-switching.',
  },
  {
    icon: Rocket,
    title: 'Founders & Teams',
    desc: 'Build company knowledge from day one. Create branches for strategic experiments, maintain governance as you grow.',
  },
];

export default function WhoItsFor() {
  return (
    <section id="who-its-for" aria-label="Who it is for" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <ParticleGraph className="opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-14 text-center">
          <h2 className="display-heading mb-4">
            Built for <span className="text-[var(--accent-secondary)]">everyone</span> who thinks in connections
          </h2>
          <p className="mx-auto max-w-2xl text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
            Whether you are a student organizing research, a founder building company knowledge,
            or a researcher connecting discoveries — Gnovium adapts to how you work.
          </p>
        </div>

        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="list"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {audiences.map((a) => (
            <motion.div
              key={a.title}
              role="listitem"
              aria-label={a.title}
              variants={cardVariants}
              whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
              className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-5 neo-depth flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3 border-b-2 border-[var(--border)] pb-3">
                <a.icon className="h-4 w-4 text-[var(--accent-secondary)] shrink-0" strokeWidth={2.5} />
                <h3 className="text-step-1 font-black font-mono uppercase tracking-wider text-[var(--foreground)]">
                  {a.title}
                </h3>
              </div>
              <p className="text-step-0 text-[var(--muted)] leading-relaxed font-mono font-bold flex-1">
                {a.desc}
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
            Currently used by students, researchers, knowledge workers, and founders. No account needed to start.
          </p>
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
