'use client';

import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function AboutSection() {
  return (
    <section id="about" aria-label="About GNOVIUM" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <ParticleGraph className="opacity-40" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          <motion.h2 variants={cardVariants} className="display-heading text-center mb-4">
            About <span className="text-[var(--accent-secondary)]">Gnovium</span>
          </motion.h2>

          {/* Content + Illustration side by side */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col md:flex-row items-center gap-8 md:gap-12"
          >
            <div className="flex-1 space-y-5">
              <p className="text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
                Gnovium was born from a simple observation: the tools we use to think with haven&apos;t
                fundamentally changed in decades. Documents, folders, and linear note-taking don&apos;t
                reflect how our minds actually work — in networks, connections, and context.
              </p>

              <p className="text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
                Gaurav isn&apos;t building another note-taking app. He&apos;s reimagining what knowledge
                infrastructure looks like for the AI era. If we could give knowledge the same capabilities
                that Git gave code — versioning, branching, merging, diffing — and combine it with the
                relational power of a knowledge graph and the intelligence of modern AI, we could unlock
                entirely new ways of working with information.
              </p>

              <p className="text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
                <span className="text-[var(--foreground)]">Free. Private. Yours.</span> Gnovium is currently in early access —
                a complete knowledge system that runs on your machine by default.
                No account required. No subscription. Just your knowledge, your rules.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 14 }}
              className="shrink-0 p-4 md:p-6"
            >
              <motion.svg
                width="200"
                height="200"
                viewBox="0 0 160 160"
                fill="none"
                role="img"
                aria-label="Gnovium robot mascot illustration"
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
                <motion.circle cx="80" cy="45" r="6" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--accent)" animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
                <rect x="32" y="85" width="10" height="15" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
                <rect x="118" y="85" width="10" height="15" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
                <motion.rect x="28" y="82" width="14" height="8" rx="4" stroke="var(--foreground)" strokeWidth="2" fill="var(--card-bg)" animate={{ rotate: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: 'center' }} />
                <motion.rect x="118" y="82" width="14" height="8" rx="4" stroke="var(--foreground)" strokeWidth="2" fill="var(--card-bg)" animate={{ rotate: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: 'center' }} />
                <rect x="48" y="128" width="18" height="10" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
                <rect x="94" y="128" width="18" height="10" rx="3" stroke="var(--foreground)" strokeWidth="2.5" fill="var(--card-bg)" />
                <motion.path d="M130 35 C130 30 125 25 120 25 C114 25 110 30 110 35 C110 42 120 48 120 48 C120 48 130 42 130 35Z" stroke="var(--foreground)" strokeWidth="2" fill="var(--accent)" opacity="0.6" animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} />
                <motion.text x="15" y="38" fontSize="14" fill="var(--foreground)" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>✦</motion.text>
                <motion.text x="140" y="60" fontSize="10" fill="var(--foreground)" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>✦</motion.text>
              </motion.svg>
            </motion.div>
          </motion.div>

          <motion.h3
            variants={cardVariants}
            className="text-step-3 font-black font-mono uppercase tracking-wider pt-4"
          >
            Contact
          </motion.h3>

          <motion.p
            variants={cardVariants}
            className="flex items-center gap-2 text-step-1 font-mono font-bold text-[var(--muted)]"
          >
            <Mail size={14} strokeWidth={2} />
            <a
              href="mailto:hello@gnovium.com"
              aria-label="Send email to hello@gnovium.com"
              className="text-[var(--accent-secondary)] border-b-2 border-[var(--accent-secondary)] pb-0.5 hover:opacity-80 transition-opacity"
            >
              hello@gnovium.com
            </a>
          </motion.p>
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
