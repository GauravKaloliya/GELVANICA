'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorContentProps {
  error?: Error;
  reset?: () => void;
  title?: string;
  message?: string;
}

export default function ErrorContent({
  error,
  reset,
  title = 'Something Went Wrong',
  message = 'An unexpected error occurred. Please try again.',
}: ErrorContentProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-24 px-4 text-center">
      <div className="border-[3px] border-[var(--foreground)] p-8 neo-depth mb-8 max-w-md">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-[var(--foreground)]" strokeWidth={1.5} />
        <div className="text-5xl font-black font-mono mb-2 text-[var(--foreground)]">500</div>
        <h1 className="text-lg font-black font-mono uppercase tracking-wider mb-2 text-[var(--foreground)]">
          {title}
        </h1>
        <p className="text-sm font-mono text-[var(--muted)] mb-6">{message}</p>
        {error && process.env.NODE_ENV === 'development' && (
          <pre className="text-xs font-mono text-left bg-[var(--code-bg)] border border-[var(--border)] p-4 mb-6 overflow-auto max-h-48 text-[var(--foreground)]">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          {reset && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[var(--foreground)] neo-depth-btn text-[var(--foreground)] font-black font-mono text-xs uppercase tracking-widest cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          )}
          <a
            href="/"
            className="inline-block px-6 py-3 border-2 border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] font-black font-mono text-xs uppercase tracking-widest transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
