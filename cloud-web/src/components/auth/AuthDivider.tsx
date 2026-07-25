'use client';

export default function AuthDivider() {
  return (
    <div className="relative flex items-center justify-center py-3">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t-2 border-[var(--border)]" />
      </div>
      <div className="relative px-3 bg-[var(--card-bg)] text-[9px] font-black font-mono uppercase tracking-widest text-[var(--muted)] z-10">
        Or continue with
      </div>
    </div>
  );
}
