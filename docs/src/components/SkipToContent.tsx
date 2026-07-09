export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--foreground)] focus:text-[var(--background)] focus:font-bold focus:font-mono focus:text-sm focus:border-2 focus:border-[var(--foreground)] focus:outline-none"
    >
      Skip to content
    </a>
  );
}
