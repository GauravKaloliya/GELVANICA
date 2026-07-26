'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-foreground display-heading">404</h1>
      <p className="mt-4 text-xl font-medium text-foreground">Page not found</p>
      <p className="mt-2 max-w-md text-step-5 text-muted">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/workspaces"
        className="mt-8 inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/90"
      >
        Back to Workspaces
      </Link>
    </div>
  );
}
