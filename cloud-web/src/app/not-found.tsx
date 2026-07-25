'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-white">404</h1>
      <p className="mt-4 text-xl font-medium text-white">Page not found</p>
      <p className="mt-2 max-w-md text-base text-zinc-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/workspaces"
        className="mt-8 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
      >
        Back to Workspaces
      </Link>
    </div>
  );
}
