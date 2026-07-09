import { Star, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-8 md:mt-12 border-t-[3px] border-[var(--foreground)] bg-[var(--card-bg)] hidden lg:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-6 gap-4">
          {/* Left - Copyright */}
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] text-center md:text-left">
            © {new Date().getFullYear()} GNOVIUM — BUILT WITH PURPOSE
          </p>

          {/* Center - Premium Creator Credit */}
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)] flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="opacity-50">CREATED &amp; BUILT BY</span>
              <a
                href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold border-b-2 border-[var(--foreground)] pb-px hover:opacity-80 transition-opacity"
              >
                GAURAV KALOLIYA
              </a>
            </div>
            <div className="flex items-center gap-4 text-[9px] tracking-[0.15em]">
              <a href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
                LINKEDIN <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <span className="opacity-30">•</span>
              <a href="https://github.com/GauravKaloliya/gnovium" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
                GITHUB <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <span className="opacity-30">•</span>
              <span className="text-[var(--muted)] flex items-center gap-1">
                <Star className="h-2.5 w-2.5" /> API v1.0.0
              </span>
            </div>
          </div>

          {/* Right - API Version */}
          <div className="text-[10px] font-mono text-[var(--muted)] hidden md:block">
            API v1.0.0
          </div>
        </div>
      </div>
    </footer>
  );
}
