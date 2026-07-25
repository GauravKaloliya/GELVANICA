'use client';

import { motion } from "framer-motion";

interface DesktopAuthBannerProps {
  isDesktop: boolean;
}

export default function DesktopAuthBanner({ isDesktop }: DesktopAuthBannerProps) {
  if (!isDesktop) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 120, damping: 14 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px] font-black tracking-widest uppercase font-mono mb-5"
    >
      <span className="w-2 h-2 bg-amber-400 animate-pulse" />
      DESKTOP APP · AUTHENTICATION REQUIRED
    </motion.div>
  );
}
