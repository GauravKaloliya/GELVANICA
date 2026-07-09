import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { bootstrapEnv } from "@gnovium/shared";

bootstrapEnv();
import Navbar from "@/components/Navbar";
import ThemeProvider from "@/components/ThemeProvider";
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
  title: "Gnovium — Knowledge Operating System",
  description:
    "Gnovium is a next-generation knowledge operating system that transforms how you capture, connect, and create with information.",
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
      <body className="min-h-full bg-background text-foreground">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <Navbar />
          <main className="smooth-scroll-container">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
