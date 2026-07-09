import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { bootstrapEnv } from "@gnovium/shared";
import gnoviumLogo from "@gnovium/shared/assets/logo/logo.png";

bootstrapEnv();

import Navigation from "@/components/Navigation";
import BackToTop from "@/components/BackToTop";
import ThemeProvider from "@/components/ThemeProvider";
import SkipToContent from "@/components/SkipToContent";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gnovium API Docs — Knowledge OS",
  description:
    "Complete API reference for Gnovium — a local-first Knowledge Operating System with block-based content, relational knowledge modeling, Git-inspired versioning, and AI-powered semantic retrieval.",
  openGraph: {
    title: "Gnovium API Docs",
    description:
      "Build intelligent knowledge applications with Gnovium's unified graph-driven API.",
    url: process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3002",
    siteName: "Gnovium",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gnovium API Docs",
    description:
      "Complete API reference for the Gnovium Knowledge Operating System.",
  },
  icons: [
    { rel: "icon", url: "/favicon.ico", sizes: "any" },
    { rel: "icon", url: gnoviumLogo.src, type: "image/jpeg" },
  ],
};

const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('gnovium-theme');
      var themes = ['dark', 'light', 'sepia', 'high-contrast', 'ocean', 'midnight'];
      if (t && themes.includes(t)) {
        var html = document.documentElement;
        html.className = html.className.replace(/\\b(dark|light|sepia|high-contrast|ocean|midnight)\\b/g, '').trim() + ' ' + t;
      }
    } catch (e) {}
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
        <ThemeProvider>
          <SkipToContent />
          <Navigation />
          {children}
          <BackToTop />
        </ThemeProvider>
      </body>
    </html>
  );
}
