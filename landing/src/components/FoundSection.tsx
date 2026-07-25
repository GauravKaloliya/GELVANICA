'use client';

import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import founderImg from '@gnovium/shared/assets/images/founder.png';

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 150, damping: 20 },
  },
};

export default function FoundSection() {
  return (
    <motion.div
      variants={cardVariants}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-5"
    >
      <div className="w-16 h-16 border-[3px] border-[var(--foreground)] bg-[var(--code-bg)] shrink-0 neo-depth-btn"
        role="img"
        aria-label="Gaurav Kaloliya founder photo"
        style={{
          backgroundImage: `url(${founderImg.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 mb-2">
          <span className="text-step-0 font-black font-mono uppercase tracking-[0.2em] text-[var(--muted)]">Created &amp; Visioned by</span>
          <span className="text-lg font-black font-mono text-[var(--foreground)] tracking-tight">GAURAV KALOLIYA</span>
          <span className="px-2 py-0.5 border border-[var(--border)] text-step-0 font-black font-mono uppercase tracking-wider text-[var(--muted)]">Founder &amp; Creator</span>
        </div>
        <blockquote className="text-step-1 text-[var(--muted)] font-mono italic leading-relaxed border-l-2 border-[var(--border)] pl-3">
          &ldquo;I believe knowledge should be alive — connected, versioned, and evolvable. Not trapped in silos or scattered across folders. Gnovium is my answer to a decade of fighting knowledge chaos.&rdquo;
        </blockquote>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Gaurav Kaloliya LinkedIn profile"
          className="text-step-0 font-black font-mono uppercase tracking-wider px-2.5 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> LinkedIn
        </a>
        <a
          href="https://github.com/GauravKaloliya/gnovium"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Gaurav Kaloliya GitHub profile"
          className="text-step-0 font-black font-mono uppercase tracking-wider px-2.5 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> GitHub
        </a>
      </div>
    </motion.div>
  );
}
