'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/services/auth";
import { API_BASE, DESKTOP_AUTH_SCHEME } from "@/lib/config/constants";
import { apiClient } from "@/lib/apiClient";
import { useSession } from "@/lib/session";
import type { AuthTokens, User } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import gnoviumLogo from "@gnovium/shared/assets/logo/logo.png";
import ParticleGraph from "../../components/ParticleGraph";
import SignUpForm from "@/components/auth/SignUpForm";
import { uploadFileWithProgress } from "@/lib/utils/upload";

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

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: loginSession } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [statusText, setStatusText] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarWarning, setAvatarWarning] = useState<string | null>(null);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tokensRef = useRef<AuthTokens | null>(null);
  const registeredUserRef = useRef<User | null>(null);
  const exchangeStartedRef = useRef(false);
  const isDesktop = searchParams.get("source") === "desktop";
  const signInHref = isDesktop ? "/auth/sign-in?source=desktop" : "/auth/sign-in";

  const completeDesktopAuth = useCallback(async (accessToken: string) => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;
    const state = crypto.randomUUID();
    const { code } = await authApi.exchangeCode(accessToken);
    window.location.href = `${DESKTOP_AUTH_SCHEME}://callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  }, []);

  useEffect(() => {
    document.title = 'Sign Up | Gnovium'
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

  const handleGoogleAuth = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const { user, tokens } = await authApi.googleLogin(idToken);
      loginSession(user, tokens);
      if (isDesktop) {
        await completeDesktopAuth(tokens.access_token);
      } else {
        router.push("/");
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
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

  const handleEmailBlur = async () => {
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) { setEmailStatus("idle"); return; }
    setEmailStatus("checking");
    try {
      const { data: result } = await authApi.checkEmail(emailTrimmed);
      setEmailStatus(result.available ? "available" : "unavailable");
    } catch { setEmailStatus("idle"); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); setUploadProgress(0); }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setUploadProgress(0);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusText("");
    setAvatarWarning(null);
    setUploadSucceeded(false);

    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nameTrimmed) { setError("Please enter your full name."); return; }
    if (nameTrimmed.length < 2) { setError("Full name must be at least 2 characters long."); return; }
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) { setError("Please enter a valid email address."); return; }
    if (emailStatus === "checking") { setError("Please wait while we check email availability."); return; }
    if (emailStatus === "unavailable") { setError("This email address is already registered."); return; }
    if (emailStatus === "idle") {
      try {
        const { data: result } = await authApi.checkEmail(emailTrimmed);
        if (!result.available) { setEmailStatus("unavailable"); setError("This email address is already registered."); return; }
        setEmailStatus("available");
      } catch { /* proceed */ }
    }
    if (!password) { setError("Please enter a password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters long."); return; }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Password must contain at least one uppercase, one lowercase, one number, and one special character.");
      return;
    }

    setLoading(true);
    try {
      setStatusText("Creating account...");
      const { user: registeredUser, tokens } = await authApi.register(emailTrimmed, password, nameTrimmed);

      tokensRef.current = tokens;
      registeredUserRef.current = registeredUser;
      let finalUser = registeredUser;
      let usedDefaultAvatar = false;

      if (avatarFile) {
        setIsUploading(true);
        const ext = avatarFile.name.split(".").pop() || "png";
        const objectKey = `users/avatars/${registeredUser.id}-${Date.now()}.${ext}`;

        const presignRes = await apiClient.post<{ data: { upload_url: string; object_key: string; id: string } }>("/files/presign", { object_key: objectKey, content_type: avatarFile.type }, tokens.access_token);
        if (!presignRes) {
          setAvatarWarning("Profile image upload unavailable — using default avatar. You can change it from profile settings later.");
          usedDefaultAvatar = true;
        } else {
          const presignData = await presignRes;
          const uploadUrl = presignData.data?.upload_url;
          const objectKey_ = presignData.data?.object_key || objectKey;
          const publicUrl = presignData.data?.id
            ? `${API_BASE}/files/${presignData.data.id}/download`
            : `${API_BASE}/files/download/${encodeURIComponent(objectKey_)}`;

          if (!uploadUrl) {
            setAvatarWarning("Profile image upload unavailable — using default avatar. You can change it from profile settings later.");
            usedDefaultAvatar = true;
          } else {
            try {
              await uploadFileWithProgress(uploadUrl, avatarFile, (pct) => setUploadProgress(pct));
              const updateRes = await apiClient.patch<{ data: Partial<User> & { avatar_url: string } }>("/auth/me", { avatar_url: publicUrl }, tokens.access_token);
              finalUser = { ...finalUser, ...updateRes.data } as User;
              setUploadSucceeded(true);
            } catch { usedDefaultAvatar = true; }
          }
        }
        setIsUploading(false);
      }

      setStatusText("Signing in...");
      loginSession(finalUser, tokensRef.current!);
      if (isDesktop) {
        await completeDesktopAuth(tokensRef.current!.access_token);
      } else {
        router.push(usedDefaultAvatar ? "/?notice=avatar_default" : "/");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      setStatusText("");
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
            className="text-3xl sm:text-4xl font-black font-mono uppercase tracking-tight text-[var(--foreground)]"
          >
            Create Account
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 100, damping: 16 }}
            className="text-xs text-[var(--muted)] font-mono font-bold mt-2"
          >
            Join the knowledge operating system
          </motion.p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] p-6 sm:p-10 hero-depth relative"
        >
          <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />

          <SignUpForm
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            error={error}
            loading={loading}
            statusText={statusText}
            emailStatus={emailStatus}
            onEmailBlur={handleEmailBlur}
            onSubmit={handleSignUp}
            onGoogleClick={handleGoogleClick}
            gsiReady={gsiReady}
            avatarFile={avatarFile}
            avatarPreview={avatarPreview}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            avatarWarning={avatarWarning}
            uploadSucceeded={uploadSucceeded}
            onFileSelect={handleFileSelect}
            onRemoveAvatar={handleRemoveAvatar}
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          />

          <p className="mt-6 text-center text-[10px] font-mono font-bold text-[var(--muted)]">
            Already have an account?{" "}
            <Link href={signInHref} className="text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--muted)] transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
