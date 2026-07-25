'use client';

import { motion } from 'framer-motion';
import {
  HardDrive, Cloud, Lock, Wifi, Cpu, Zap,
  Users, RefreshCw, Globe, MonitorSmartphone, Shield, Sliders,
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

const localFeatures = [
  { icon: Lock, label: 'Your data stays yours' },
  { icon: Wifi, label: 'Works without internet' },
  { icon: Cpu, label: 'AI runs on your machine' },
  { icon: Zap, label: 'No setup required' },
  { icon: Globe, label: 'Full privacy by default' },
  { icon: MonitorSmartphone, label: 'Instant, always snappy' },
];

const cloudFeatures = [
  { icon: Users, label: 'Collaborate with teams' },
  { icon: RefreshCw, label: 'Sync across devices' },
  { icon: Shield, label: 'Automatic backups' },
  { icon: Sliders, label: 'Managed for you' },
  { icon: Globe, label: 'Access from anywhere' },
  { icon: MonitorSmartphone, label: 'Works on all your devices' },
];

export default function DualModeSection() {
  return (
    <section id="modes" aria-label="Cloud and local modes" className="relative min-h-screen flex items-center overflow-hidden py-16">
      <ParticleGraph className="opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-16 text-center">
          <h2 className="display-heading mb-4">
            Two modes.{' '}
            <span className="text-[var(--accent-secondary)]">One</span>{' '}
            knowledge system
          </h2>
          <p className="mx-auto max-w-2xl text-step-1 text-[var(--muted)] leading-relaxed font-mono font-bold">
            Same experience. Same features. Choose what works for you — or use both.
          </p>
        </div>

        <RevealSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="list"
          className="grid gap-8 md:grid-cols-2"
        >
          <motion.div
            role="listitem"
            aria-label="Local mode"
            variants={cardVariants}
            whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
            className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth flex flex-col"
          >
            <div className="flex items-center gap-3 mb-5 border-b-2 border-[var(--border)] pb-4">
              <div className="w-10 h-10 border-2 border-[var(--foreground)] flex items-center justify-center bg-[var(--code-bg)] shrink-0">
                <HardDrive className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-step-3 font-black font-mono uppercase tracking-wider">
                  <span className="text-emerald-400">Local</span> Mode
                </h3>
                <p className="text-step-0 font-mono font-bold text-[var(--muted)] uppercase tracking-widest">
                  Default &mdash; Your Knowledge Stays Yours
                </p>
              </div>
            </div>

            <p className="text-step-0 text-[var(--muted)] leading-relaxed font-mono font-bold mb-5">
              Run Gnovium entirely on your device. Works offline, respects your privacy,
              requires no account. Your data never leaves your machine unless you choose to share it.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {localFeatures.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--border)] bg-[var(--code-bg)]"
                >
                  <f.icon className="h-3 w-3 text-emerald-400 shrink-0" strokeWidth={2.5} />
                  <span className="text-step-0 font-mono font-bold text-[var(--foreground)]">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-step-0 font-mono font-bold text-[var(--muted)] italic border-t-2 border-[var(--border)] pt-3 mt-auto">
              Perfect for personal projects, research, journaling, and anything private
            </div>
          </motion.div>

          <motion.div
            role="listitem"
            aria-label="Cloud mode"
            variants={cardVariants}
            whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
            className="bg-[var(--card-bg)] border-[3px] border-[var(--accent-secondary)] rounded-none p-6 neo-depth flex flex-col relative"
          >
            <div className="absolute -top-3 right-4 px-3 py-0.5 border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] text-step-0 font-black font-mono uppercase tracking-wider">
              Optional
            </div>

            <div className="flex items-center gap-3 mb-5 border-b-2 border-[var(--border)] pb-4">
              <div className="w-10 h-10 border-2 border-[var(--accent-secondary)] flex items-center justify-center bg-[var(--code-bg)] shrink-0">
                <Cloud className="h-5 w-5 text-[var(--accent-secondary)]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-step-3 font-black font-mono uppercase tracking-wider">
                  <span className="text-[var(--accent-secondary)]">Cloud</span> Mode
                </h3>
                <p className="text-step-0 font-mono font-bold text-[var(--muted)] uppercase tracking-widest">
                  Optional &mdash; Collaborate Without Compromise
                </p>
              </div>
            </div>

            <p className="text-step-0 text-[var(--muted)] leading-relaxed font-mono font-bold mb-5">
              Enable sync, share with your team, and access your knowledge from any device.
              Same experience as Local Mode — just amplified with collaboration and peace of mind.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {cloudFeatures.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--border)] bg-[var(--code-bg)]"
                >
                  <f.icon className="h-3 w-3 text-[var(--accent-secondary)] shrink-0" strokeWidth={2.5} />
                  <span className="text-step-0 font-mono font-bold text-[var(--foreground)]">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-step-0 font-mono font-bold text-[var(--muted)] italic border-t-2 border-[var(--border)] pt-3 mt-auto">
              Perfect for teams, multi-device workflows, and knowing your data is backed up
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover={{ scale: 1.002, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }}
          className="mt-8 border-2 border-[var(--border)] bg-[var(--card-bg)] p-5 text-center"
        >
          <p className="text-step-0 font-mono font-bold text-[var(--muted)] mb-4">
            Start locally. Go cloud when you need to. No migration. No lock-in.
          </p>
          <div className="border-t-2 border-[var(--border)] pt-4">
            <p className="text-step-1 font-black font-mono uppercase tracking-wider text-[var(--foreground)]">
              One knowledge model. Two deployment modes.
            </p>
            <p className="text-step-0 font-mono font-bold text-[var(--muted)] mt-2 leading-relaxed">
              Every entity, block, relation, tag, version, branch, and graph operation works identically
              in Local and Cloud mode. Your data, your rules — on your machine or in the cloud.{' '}
              <span className="text-[var(--foreground)]">Write once, run anywhere.</span>
            </p>
          </div>
        </motion.div>
        </RevealSection>
      </div>
    </section>
  );
}
