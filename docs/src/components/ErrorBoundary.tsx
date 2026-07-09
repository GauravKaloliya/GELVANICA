'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-4xl font-black font-mono mb-4 text-[var(--foreground)]">500</div>
          <h1 className="text-lg font-black font-mono uppercase tracking-wider mb-2 text-[var(--foreground)]">
            Something went wrong
          </h1>
          <p className="text-sm font-mono text-[var(--muted)] max-w-md">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 border-2 border-[var(--foreground)] neo-depth-btn text-[var(--foreground)] font-black font-mono text-xs uppercase tracking-widest cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
