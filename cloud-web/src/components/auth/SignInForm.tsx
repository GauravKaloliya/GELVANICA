'use client';

import { Loader, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import GoogleOAuthButton from "./GoogleOAuthButton";

interface SignInFormProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleClick: () => void;
  gsiReady: boolean;
}

export default function SignInForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
  onGoogleClick,
  gsiReady,
}: SignInFormProps) {
  return (
    <motion.form
      key="signin"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 relative z-10"
      onSubmit={onSubmit}
    >
      <div>
        <label htmlFor="signin-email" className="block text-[10px] font-black font-mono uppercase tracking-widest text-[var(--foreground)] mb-2">
          Email Address
        </label>
        <input
          id="signin-email"
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
        <label htmlFor="signin-password" className="block text-[10px] font-black font-mono uppercase tracking-widest text-[var(--foreground)] mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="signin-password"
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

        <GoogleOAuthButton onClick={onGoogleClick} loading={loading} gsiReady={gsiReady} />
      </div>
    </motion.form>
  );
}
