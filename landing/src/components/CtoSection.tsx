'use client';

import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import ctoImg from '@gnovium/shared/assets/images/cto.png';

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 150, damping: 20 },
  },
};

export default function CtoSection() {
  return (
    <motion.div
      variants={cardVariants}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-5"
    >
      <div className="w-16 h-16 border-[3px] border-[var(--foreground)] bg-[var(--code-bg)] shrink-0 neo-depth-btn"
        role="img"
        aria-label="Arpita Makwana CTO photo"
        style={{
          backgroundImage: `url(${ctoImg.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 mb-2">
          <span className="text-step-0 font-black font-mono uppercase tracking-[0.2em] text-[var(--muted)]">Built by</span>
          <span className="text-lg font-black font-mono text-[var(--foreground)] tracking-tight">ARPITA MAKWANA</span>
          <span className="px-2 py-0.5 border border-[var(--border)] text-step-0 font-black font-mono uppercase tracking-wider text-[var(--muted)]">CTO</span>
        </div>
        <blockquote className="text-step-1 text-[var(--muted)] font-mono italic leading-relaxed border-l-2 border-[var(--border)] pl-3">
          &ldquo;I&rsquo;ve shipped a lot of code. This is the only system I&rsquo;d call my proudest work — not because it&rsquo;s perfect, but because every microservice, every query path, every failure mode was engineered with intention. Knowledge this fluid doesn&rsquo;t happen by accident. It happens because someone gave a damn about the seams.&rdquo;
        </blockquote>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="https://www.linkedin.com/in/arpita-makwana-3a7a57269"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Arpita Makwana LinkedIn profile"
          className="text-step-0 font-black font-mono uppercase tracking-wider px-2.5 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> LinkedIn
        </a>
        <a
          href="https://github.com/ArpitaMakvana"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Arpita Makwana GitHub profile"
          className="text-step-0 font-black font-mono uppercase tracking-wider px-2.5 py-1.5 border-2 border-[var(--border)] neo-depth-btn text-[var(--foreground)] hover:bg-[var(--code-bg)] transition-all flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> GitHub
        </a>
      </div>
    </motion.div>
  );
}
