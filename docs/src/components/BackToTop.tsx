'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
      setShow(window.scrollY > 600 && !nearBottom);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-30 border-[3px] border-[var(--foreground)] bg-[var(--card-bg)] px-4 py-3 text-[var(--foreground)] font-mono font-black tracking-widest neo-depth-btn cursor-pointer"
      aria-label="Back to top"
    >
      <ArrowUp size={14} />
    </button>
  );
}
