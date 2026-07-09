'use client';

export default function LocalAppAuthCallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" />
      <h1 className="text-xl font-mono font-black uppercase tracking-wider text-zinc-100 mb-2">
        Authentication successful
      </h1>
      <p className="text-sm font-mono text-zinc-400">
        Returning to Gnovium app...
      </p>
    </div>
  );
}
