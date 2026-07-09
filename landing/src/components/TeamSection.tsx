'use client';

import { motion } from 'framer-motion';
import { RevealSection } from './RevealSection';
import FoundSection from './FoundSection';
import CtoSection from './CtoSection';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export default function TeamSection() {
  return (
    <section id="team" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <RevealSection>
          <motion.h2
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="display-heading text-center mb-12"
          >
            <span className="text-[var(--accent-secondary)]">Team</span>
          </motion.h2>
        </RevealSection>

        <div className="space-y-6">
          <RevealSection>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6"
            >
              <FoundSection />
            </motion.div>
          </RevealSection>

          <RevealSection>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="border-2 border-[var(--border)] bg-[var(--card-bg)] p-6"
            >
              <CtoSection />
            </motion.div>
          </RevealSection>
        </div>
      </div>
    </section>
  );
}
