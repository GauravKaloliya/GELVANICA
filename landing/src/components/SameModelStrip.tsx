'use client';

import { motion } from 'framer-motion';
import { RevealSection } from './RevealSection';

export default function SameModelStrip() {
  return (
    <section className="relative min-h-screen flex items-center py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealSection>
        <motion.div
          whileHover={{ scale: 1.002, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
          className="border-[3px] border-[var(--foreground)] bg-[var(--card-bg)] p-5 neo-depth text-center"
        >
          <p className="text-step-1 font-black font-mono uppercase tracking-wider text-[var(--foreground)]">
            One knowledge model. Two deployment modes.
          </p>
          <p className="text-step-0 font-mono font-bold text-[var(--muted)] mt-2 leading-relaxed">
            Every entity, block, relation, tag, version, branch, and graph operation works identically in Local and Cloud mode.
            Your data, your rules — on your machine or in the cloud. <span className="text-[var(--foreground)]">Write once, run anywhere.</span>
          </p>
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
