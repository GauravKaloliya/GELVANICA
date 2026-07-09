"use client"

import { useSession } from "@/lib/session"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Network, History, FilePlus, Search, Sparkles, BookOpen, ExternalLink, Plus, Upload } from "lucide-react"
import { getAvatarUrl } from "@/lib/avatar"
import { docsUrl, Routes } from "@gnovium/shared"
import { motion } from "framer-motion"
import ParticleGraph from "./components/ParticleGraph"

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
}

export default function Home() {
  const { user, isLoading, isAuthenticated } = useSession()
  const router = useRouter()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(Routes.cloudWeb.signIn.build({}))
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('notice') === 'avatar_default') {
      setNotice('avatar_default')
      const url = new URL(window.location.href)
      url.searchParams.delete('notice')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="skeleton-card min-h-[220px] rounded-none border-2 border-dashed flex flex-col justify-between" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="skeleton-card min-h-[220px] rounded-none p-6 border-2 border-dashed" />
          <div className="skeleton-card min-h-[220px] rounded-none p-6 border-2 border-dashed" />
          <div className="skeleton-card min-h-[220px] rounded-none p-6 border-2 border-dashed" />
        </div>

        <div className="skeleton-card min-h-[140px] rounded-none border-2 border-dashed" />
      </div>
    )
  }

  if (!user) return null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10"
    >

      {/* Notice Banner */}
      {notice === 'avatar_default' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border-2 border-amber-500 bg-amber-500/10 font-mono text-[10px] font-bold text-amber-500"
        >
          Profile image could not be uploaded. A default avatar has been set. You can change it later in your profile settings.
        </motion.div>
      )}

      {/* Hero */}
      <motion.div
        variants={cardVariants}
        className="p-6 sm:p-8 rounded-none border-[3px] border-[var(--foreground)] hero-depth flex flex-col md:flex-row items-stretch justify-between gap-8 overflow-hidden relative min-h-[220px]"
      >
        <ParticleGraph />

        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        <div className="relative z-10 w-full flex items-stretch gap-6">
          <div className="relative w-[150px] shrink-0 border-2 border-[var(--foreground)] bg-[var(--sunken-bg)] shadow-[4px_4px_0px_0px_var(--shadow-color)] overflow-hidden">
            <img
              src={user.avatar_url || getAvatarUrl(user.name || user.email)}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest uppercase font-mono w-fit">
              <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
              WORKSPACE ACTIVE · KNOWLEDGE ENGINE
            </div>
            <h1 className="display-heading text-[var(--foreground)] uppercase text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none">
              Welcome back, {user.name}!
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed font-mono font-bold">
              Your knowledge operating system is ready.
            </p>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.05, rotate: -3 }}
          className="relative z-10 shrink-0 self-center p-4 bg-[var(--card-bg)] border-2 border-[var(--foreground)] shadow-[4px_4px_0px_0px_var(--shadow-color)] flex flex-col items-center justify-center w-36 h-36 font-mono cursor-pointer"
        >
          <span className="text-[9px] font-black uppercase text-[var(--muted)] tracking-wider">MEMBER SINCE</span>
          <span className="text-xl font-black mt-2 text-[var(--foreground)]">
            {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </span>
        </motion.div>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

        {/* Knowledge Graph Card */}
        <motion.div
          variants={cardVariants}
          className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth flex flex-col justify-between min-h-[240px]"
        >
          <div>
            <div className="flex items-center gap-2 mb-4 border-b-2 border-[var(--border)] pb-3">
              <Network size={18} strokeWidth={2.5} />
              <h3 className="text-sm font-black font-mono uppercase tracking-wider text-[var(--foreground)]">Knowledge Graph</h3>
            </div>
            <div className="flex items-center justify-center py-6 text-[var(--muted)]">
              <div className="flex flex-col items-center gap-3">
                <Network size={40} strokeWidth={1.5} className="text-[var(--border)]" />
                <p className="text-[10px] font-mono font-bold text-center text-[var(--muted)]">
                  Visualize connections between your pages, entities, and ideas.
                </p>
              </div>
            </div>
          </div>
          <button className="w-full text-center font-mono text-[10px] font-black uppercase tracking-wider py-2 border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] neo-depth-btn cursor-pointer">
            Explore Graph
          </button>
        </motion.div>

        {/* Recent Activity Card */}
        <motion.div
          variants={cardVariants}
          className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth flex flex-col justify-between min-h-[240px]"
        >
          <div>
            <div className="flex items-center gap-2 mb-4 border-b-2 border-[var(--border)] pb-3">
              <History size={18} strokeWidth={2.5} />
              <h3 className="text-sm font-black font-mono uppercase tracking-wider text-[var(--foreground)]">Recent Activity</h3>
            </div>
            <div className="p-4 border-2 border-dashed border-[var(--border)] bg-[var(--sunken-bg)] text-center font-mono text-[10px] text-[var(--muted)] font-black uppercase tracking-wider">
              No pages created yet.
            </div>
          </div>
          <div className="pt-4">
            <button className="w-full text-center font-mono text-[10px] font-black uppercase tracking-wider py-2 border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-[var(--foreground)] neo-depth-btn hover:bg-[var(--code-bg)] cursor-pointer">
              View All
            </button>
          </div>
        </motion.div>

        {/* Quick Actions Card */}
        <motion.div
          variants={cardVariants}
          className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth flex flex-col justify-between min-h-[240px]"
        >
          <div>
            <div className="flex items-center gap-2 mb-4 border-b-2 border-[var(--border)] pb-3">
              <Sparkles size={18} strokeWidth={2.5} />
              <h3 className="text-sm font-black font-mono uppercase tracking-wider text-[var(--foreground)]">Quick Actions</h3>
            </div>
            <ul className="space-y-3 font-mono text-[11px] font-bold text-[var(--foreground)]">
              <li>
                <button className="hover:opacity-80 flex items-center gap-1.5 cursor-pointer w-full text-left">
                  <FilePlus size={12} strokeWidth={2.5} />
                  <span>Create New Page</span>
                </button>
              </li>
              <li>
                <button className="hover:opacity-80 flex items-center gap-1.5 cursor-pointer w-full text-left">
                  <Search size={12} strokeWidth={2.5} />
                  <span>AI Semantic Search</span>
                </button>
              </li>
              <li>
                <a href={docsUrl()} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 flex items-center gap-1.5">
                  <BookOpen size={12} strokeWidth={2.5} />
                  <span>View Documentation</span>
                  <ExternalLink size={10} className="opacity-60" />
                </a>
              </li>
            </ul>
          </div>
          <div className="pt-4">
            <button className="w-full text-center font-mono text-[10px] font-black uppercase tracking-wider py-2 border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] neo-depth-btn cursor-pointer">
              <Plus size={12} className="inline mr-1" />
              New Page
            </button>
          </div>
        </motion.div>

      </div>

      {/* Workspace Overview */}
      <motion.div
        variants={cardVariants}
        className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] rounded-none p-6 neo-depth"
      >
        <div className="flex items-center gap-2 mb-6 border-b-2 border-[var(--border)] pb-3">
          <Network size={18} strokeWidth={2.5} />
          <h3 className="text-sm font-black font-mono uppercase tracking-wider text-[var(--foreground)]">Workspace Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 border-2 border-[var(--border)] bg-[var(--sunken-bg)] text-center">
            <div className="text-2xl font-black font-mono text-[var(--foreground)]">0</div>
            <div className="text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)] mt-1">Pages</div>
          </div>
          <div className="p-4 border-2 border-[var(--border)] bg-[var(--sunken-bg)] text-center">
            <div className="text-2xl font-black font-mono text-[var(--foreground)]">0</div>
            <div className="text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)] mt-1">Entities</div>
          </div>
          <div className="p-4 border-2 border-[var(--border)] bg-[var(--sunken-bg)] text-center">
            <div className="text-2xl font-black font-mono text-[var(--foreground)]">0</div>
            <div className="text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)] mt-1">Connections</div>
          </div>
        </div>
      </motion.div>

    </motion.div>
  )
}
