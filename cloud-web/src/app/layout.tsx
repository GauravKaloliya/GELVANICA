import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { bootstrapEnv } from "@gnovium/shared";
import Script from "next/script";

bootstrapEnv();

import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import RouteLoading from "@/components/ui/RouteLoading";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: {
    default: "Gnovium",
    template: "%s | Gnovium",
  },
  description:
    "Knowledge Operating System \u2014 organize, connect, and discover your knowledge",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Gnovium",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('gnovium-theme');
      if (!t || t === 'system') {
        t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var html = document.documentElement;
      html.className = html.className.replace(/\\b(dark|light|sepia|high-contrast|ocean|midnight)\\b/g, '').trim() + ' ' + t;
    } catch (e) { console.error('Theme init failed:', e); }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <Providers>
          <Navbar />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Skip to content
          </a>
          <main className="pt-20">
            <Suspense fallback={<RouteLoading variant="page" />}>
              {children}
            </Suspense>
          </main>
          <OfflineIndicator />
        </Providers>
      </body>
    </html>
  );
}
