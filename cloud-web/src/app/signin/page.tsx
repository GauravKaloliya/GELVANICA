'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, googleLogin } from "@/lib/api";
import { useSession } from "@/lib/session";
import Link from "next/link";
import Image from "next/image";
import { Loader, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Routes } from "@gnovium/shared";
import gnoviumLogo from "@gnovium/shared/assets/logo/logo.png";
import ParticleGraph from "../components/ParticleGraph";

declare global {
  interface Window {
    google?: {
      accounts: {
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
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const router = useRouter();
  const { login: loginSession } = useSession();

  useEffect(() => {
    if (document.getElementById('gsi-script')) {
      setGsiReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    script.onerror = () => setError('Failed to load Google Sign-In.');
    document.body.appendChild(script);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailTrimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!emailRegex.test(emailTrimmed)) {
      setError("Please enter a valid email address (e.g., name@example.com).");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const { user, tokens } = await login(emailTrimmed, password);
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "local-app") {
        const authData = encodeURIComponent(JSON.stringify({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, user }));
        window.location.href = `/auth/local-app/callback?auth=${authData}`;
        return;
      }
      loginSession(user, tokens);
      router.push("/");
    } catch (err: any) {
      let friendlyMsg = err.message || "An unexpected error occurred.";
      if (friendlyMsg.includes("Invalid email or password") || friendlyMsg.toLowerCase().includes("forbidden")) {
        friendlyMsg = "Incorrect email or password. Please verify your credentials and try again.";
      } else if (friendlyMsg.includes("Failed to fetch") || friendlyMsg.toLowerCase().includes("networkerror")) {
        friendlyMsg = "Network connection failed. Please check your internet connection and try again.";
      }
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleClick = () => {
    if (!gsiReady || !window.google || !googleClientId) return;
    setError(null);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error) {
          setError('Google sign-in failed. Please try again.');
          return;
        }
        if (!response.id_token) {
          setError('Google sign-in was cancelled.');
          return;
        }
        setLoading(true);
        try {
          const { user, tokens } = await googleLogin(response.id_token);
          const params = new URLSearchParams(window.location.search);
          if (params.get("mode") === "local-app") {
            const authData = encodeURIComponent(JSON.stringify({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, user }));
            window.location.href = `/auth/local-app/callback?auth=${authData}`;
            return;
          }
          loginSession(user, tokens);
          router.push('/');
        } catch (err: any) {
          setError(err.message || 'Google sign-in failed.');
        } finally {
          setLoading(false);
        }
      },
    });

    client.requestAccessToken();
  };

  return (
    <div className="flex min-h-[90vh] flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">

      {/* Cinematic Particle Background */}
      <div className="absolute inset-0 z-0">
        <ParticleGraph className="opacity-60" />
      </div>

      {/* Gradient shimmer overlay — matching docs hero */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(135deg, var(--foreground) 0%, transparent 50%, var(--foreground) 100%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 4s ease-in-out infinite',
        }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 z-[1] grid-bg opacity-30 pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md mx-auto"
      >
        {/* Logo + Heading */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center mb-10">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            className="relative h-14 w-14 overflow-hidden rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] shadow-[4px_4px_0px_0px_var(--shadow-color)] mb-5 cursor-pointer transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_var(--shadow-color)]"
          >
            <Image
              src={gnoviumLogo}
              alt="Gnovium logo"
              fill
              sizes="56px"
              className="object-cover"
              priority
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 14 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest uppercase font-mono mb-5"
          >
            <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
            SECURE SESSION · AUTHENTICATION REQUIRED
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 16 }}
            className="text-3xl sm:text-4xl font-black font-mono uppercase tracking-tight text-[var(--foreground)]"
          >
            Sign In
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 100, damping: 16 }}
            className="text-xs text-[var(--muted)] font-mono font-bold mt-2"
          >
            Access your knowledge operating system
          </motion.p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] p-6 sm:p-10 hero-depth relative"
        >
          <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />

          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-black font-mono uppercase tracking-widest text-[var(--foreground)] mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] px-3 py-3 text-xs font-mono text-[var(--foreground)] outline-none transition-all focus:bg-[var(--code-bg)] focus:shadow-[3px_3px_0px_0px_var(--shadow-color)] hover:border-[var(--foreground)]"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[10px] font-black font-mono uppercase tracking-widest text-[var(--foreground)] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] px-3 py-3 pr-10 text-xs font-mono text-[var(--foreground)] outline-none transition-all focus:bg-[var(--code-bg)] focus:shadow-[3px_3px_0px_0px_var(--shadow-color)] hover:border-[var(--foreground)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} strokeWidth={2.5} /> : <Eye size={14} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 border-2 border-rose-500 bg-rose-500/10 font-mono text-[10px] font-bold text-rose-500"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4 pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-center font-mono text-xs font-black uppercase tracking-wider py-3.5 border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] neo-depth-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </>
                )}
              </motion.button>

              {googleClientId && <>
                <div className="relative flex items-center justify-center py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-[var(--border)]" />
                  </div>
                  <div className="relative px-3 bg-[var(--card-bg)] text-[9px] font-black font-mono uppercase tracking-widest text-[var(--muted)] z-10">
                    Or continue with
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-center font-mono text-xs font-black uppercase tracking-wider py-3 border-2 border-[var(--foreground)] bg-[var(--card-bg)] text-[var(--foreground)] neo-depth-btn flex items-center justify-center gap-2 cursor-pointer hover:bg-[var(--code-bg)] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Google</span>
                </motion.button>
              </>}
            </div>
          </form>

          <p className="mt-8 text-center text-xs font-mono text-[var(--muted)]">
            Not a member?{" "}
            <Link
               href={Routes.cloudWeb.signUp.build({})}
              className="font-black text-[var(--foreground)] border-b-2 border-[var(--foreground)] pb-0.5 hover:opacity-80 transition-opacity"
            >
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
