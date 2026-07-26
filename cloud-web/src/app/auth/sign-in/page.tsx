'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { authService } from "@/lib/services/auth";
import { useSession } from "@/lib/session";
import { DESKTOP_AUTH_SCHEME } from "@/lib/config/constants";
import { useUIStore } from "@/stores/uiStore";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { UniversalNavbar, CloudWebRightSlot, CloudWebMobileAuthSlot } from "@gnovium/shared";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import gnoviumLogo from "@gnovium/shared/assets/logo/logo.png";
import ParticleGraph from "../../components/ParticleGraph";
import SignInForm from "@/components/auth/SignInForm";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              id_token?: string;
              error?: string;
            }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { login: loginSession, tokens, user, logout, isLoading: sessionLoading } = useSession();
  const { resolvedTheme, toggleTheme } = useUIStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const exchangeStartedRef = useRef(false);
  const isDesktop = searchParams.get("source") === "desktop";
  const signUpHref = isDesktop ? "/auth/sign-up?source=desktop" : "/auth/sign-up";

  const completeDesktopAuth = useCallback(async (accessToken: string) => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;
    const state = crypto.randomUUID();
    const { data: { code } } = await authService.exchangeCode(accessToken);
    window.location.href = `${DESKTOP_AUTH_SCHEME}://callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  }, []);

  useEffect(() => {
    document.title = 'Sign In | Gnovium'
  }, [])

  useEffect(() => {
    if (document.getElementById("gsi-script")) {
      setGsiReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    script.onerror = () => setGsiReady(false);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isDesktop || !tokens?.access_token) return;
    let cancelled = false;
    const exchange = async () => {
      try {
        if (!cancelled) await completeDesktopAuth(tokens.access_token);
      } catch {
        // exchange failed
      }
    };
    exchange();
    return () => { cancelled = true; };
  }, [completeDesktopAuth, isDesktop, tokens?.access_token]);

  const handleGoogleAuth = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const { data } = await authService.googleLogin(idToken);
      const tokens = { access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type, expires_in: data.expires_in };
      loginSession(data.user, tokens);
      if (isDesktop) {
        await completeDesktopAuth(tokens.access_token);
      }
      window.location.href = "/app";
    } finally {
      setLoading(false);
    }
  }, [completeDesktopAuth, isDesktop, loginSession, router]);

  const handleGoogleClick = () => {
    if (!gsiReady || !window.google || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;
    setError(null);
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (!response.credential) {
          setError("Google sign-in was cancelled.");
          return;
        }
        handleGoogleAuth(response.credential);
      },
    });
    window.google.accounts.id.prompt();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setLoading(true);
    try {
      const { data } = await authService.login(emailTrimmed, password);
      const tokens = { access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type, expires_in: data.expires_in };
      loginSession(data.user, tokens);
      if (isDesktop) {
        await completeDesktopAuth(tokens.access_token);
      }
      window.location.href = "/app";
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UniversalNavbar
        variant="cloud-web"
        theme={resolvedTheme}
        onToggleTheme={toggleTheme}
        navItems={[]}
        pathname={pathname}
        rightSlot={
          <CloudWebRightSlot
            user={user}
            isLoading={sessionLoading}
            pathname={pathname}
            onLogout={logout}
            getAvatarUrl={getAvatarUrl}
          />
        }
        mobileBottomSlot={(onClose) => (
          <CloudWebMobileAuthSlot
            user={user}
            isLoading={sessionLoading}
            pathname={pathname}
            onLogout={logout}
            onClose={onClose}
            getAvatarUrl={getAvatarUrl}
          />
        )}
      />
      <div className="flex min-h-screen flex-col justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ParticleGraph className="opacity-60" />
      </div>
      <div
        className="absolute inset-0 z-[1] opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(135deg, var(--foreground) 0%, transparent 50%, var(--foreground) 100%)",
          backgroundSize: "200% 200%",
          animation: "shimmer 4s ease-in-out infinite",
        }}
      />
      <div className="absolute inset-0 z-[1] grid-bg opacity-30 pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center mb-10">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -3 }}
              className="relative h-14 w-14 overflow-hidden rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] shadow-[4px_4px_0px_0px_var(--shadow-color)] mb-5 cursor-pointer transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_var(--shadow-color)]"
            >
              <Image src={gnoviumLogo} alt="Gnovium logo" fill sizes="56px" className="object-cover" priority />
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 120, damping: 14 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest uppercase font-mono mb-5"
          >
            <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
            SECURE SESSION · AUTHENTICATION REQUIRED
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 16 }}
            className="text-3xl sm:text-4xl font-black font-mono uppercase tracking-tight text-[var(--foreground)] display-heading"
          >
            {isDesktop ? "Link Desktop App" : "Sign In"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 100, damping: 16 }}
            className="text-step-1 text-[var(--muted)] font-mono font-bold mt-2"
          >
            {isDesktop ? "Authenticate your GNOVIUM desktop application" : "Access your knowledge operating system"}
          </motion.p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] p-6 sm:p-10 hero-depth relative"
        >
          <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />

          <SignInForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            error={error}
            loading={loading}
            onSubmit={handleSignIn}
            onGoogleClick={handleGoogleClick}
            gsiReady={gsiReady}
          />

          <p className="mt-6 text-center text-[10px] font-mono font-bold text-[var(--muted)]">
            Don&apos;t have an account?{" "}
            <Link href={signUpHref} className="text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--muted)] transition-colors">
              Create one
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
}
