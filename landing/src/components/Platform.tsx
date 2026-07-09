'use client';

import { motion } from 'framer-motion';
import { Monitor, Globe, Braces, ArrowRight } from 'lucide-react';
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

const platforms = [
  {
    icon: Monitor,
    title: 'Desktop App',
    tagline: 'Your knowledge, native & offline',
    desc: 'A full-featured Electron app for macOS, Linux, and Windows. 22 block types, interactive knowledge graph, versioning, search, tags, entity browser, health scoring, settings, trash, and keyboard shortcuts. The Flask backend auto-starts — zero configuration.',
    features: ['10 workspace modules', '22 block types', '6 themes', 'Auto-start backend'],
  },
  {
    icon: Globe,
    title: 'Web Client',
    tagline: 'Access from anywhere',
    desc: 'A Next.js dashboard for authentication, workspace overview, and quick access. Sign in, check your dashboard, and connect to the cloud API when you need remote access.',
    features: ['Google OAuth', 'Dashboard overview', 'Workspace stats', 'Responsive design'],
  },
  {
    icon: Braces,
    title: 'REST API',
    tagline: 'Build on top of Gnovium',
    desc: '111 endpoints across 22 modules — entities, blocks, relations, graph, search, AI, governance, versioning, and more. Same API contract in local and cloud mode. Build your own tools on top.',
    features: ['OpenAPI 3.0.3 spec', 'JWT authentication', 'Rate limiting', '80+ routes'],
  },
];

export default function Platform() {
  return (
    <section id="platform" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <ParticleGraph className="opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-14 text-center">
          <h2 className="display-heading mb-4">
            Everywhere you <span className="text-[var(--accent-secondary)]">need</span> it
          </h2>
          <p className="mx-auto max-w-2xl text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
            Desktop app for deep work. Web client for quick access. API for custom integrations.
            One knowledge system, three surfaces.
          </p>
        </div>

        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-8 md:grid-cols-3"
        >
          {platforms.map((p) => (
            <motion.div
              key={p.title}
              variants={cardVariants}
              whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
              className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth flex flex-col"
            >
              <div className="w-10 h-10 border-2 border-[var(--foreground)] flex items-center justify-center bg-[var(--code-bg)] mb-4">
                <p.icon className="h-5 w-5 text-[var(--accent-secondary)]" strokeWidth={2.5} />
              </div>
              <h3 className="text-step-3 font-black font-mono uppercase tracking-wider mb-1">{p.title}</h3>
              <p className="text-step-0 font-mono font-bold text-[var(--accent-secondary)] uppercase tracking-widest mb-3">{p.tagline}</p>
              <p className="text-step-0 text-[var(--muted)] leading-relaxed font-mono font-bold mb-4 flex-1">
                {p.desc}
              </p>
              <div className="border-t-2 border-[var(--border)] pt-3 space-y-1.5">
                {p.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--accent-secondary)] shrink-0" />
                    <span className="text-step-0 font-mono font-bold text-[var(--foreground)]">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
