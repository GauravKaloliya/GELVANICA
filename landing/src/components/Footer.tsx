import Link from 'next/link';
import { Routes, docsUrl, cloudWebUrl } from '@gnovium/shared';

const sections = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: Routes.landing.download.build({}), label: 'Download' },
      { href: cloudWebUrl(), label: 'Get Started' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: docsUrl(), label: 'Documentation' },
      { href: docsUrl(Routes.docs.changelog.build({})), label: 'Changelog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#about', label: 'About' },
      { href: '#about', label: 'Contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t-2 border-[var(--border)] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <span className="font-mono text-step-3 font-black uppercase tracking-wider">
              Gnovium
            </span>
            <p className="font-mono text-step-0 text-[var(--muted)] mt-2">
              Knowledge Operating System
            </p>
          </div>

          {sections.map((s) => (
            <div key={s.title}>
              <h4 className="font-mono text-step-0 font-black uppercase tracking-widest text-[var(--muted)] mb-3">
                {s.title}
              </h4>
              <ul className="space-y-2">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-mono text-step-1 text-[var(--foreground)] hover:opacity-70 transition-opacity"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t-2 border-[var(--border)] pt-8 text-center font-mono text-step-0 text-[var(--muted)]">
          &copy; {new Date().getFullYear()} Gnovium. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
