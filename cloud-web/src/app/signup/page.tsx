'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { register, checkEmail, API_BASE, type AuthTokens, type User } from "@/lib/api";
import { useSession } from "@/lib/session";
import Link from "next/link";
import Image from "next/image";
import { Loader, Upload, Trash2, Sparkles, Eye, EyeOff, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Routes } from "@gnovium/shared";
import gnoviumLogo from "@gnovium/shared/assets/logo/logo.png";
import ParticleGraph from "../components/ParticleGraph";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
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

function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(file);
  });
}

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarWarning, setAvatarWarning] = useState<string | null>(null);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tokensRef = useRef<AuthTokens | null>(null);
  const registeredUserRef = useRef<User | null>(null);

  const router = useRouter();
  const { login: loginSession } = useSession();

  const getDisplayAvatar = () => {
    if (avatarPreview) return avatarPreview;
    if (name.trim()) return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`;
    return "";
  };

  const showDefaultAvatar = !avatarPreview && !name.trim();

  const handleEmailBlur = async () => {
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    try {
      const result = await checkEmail(emailTrimmed);
      setEmailStatus(result.available ? 'available' : 'unavailable');
    } catch {
      setEmailStatus('idle');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusText("");
    setAvatarWarning(null);
    setUploadSucceeded(false);

    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nameTrimmed) {
      setError("Please enter your full name.");
      return;
    }
    if (nameTrimmed.length < 2) {
      setError("Full name must be at least 2 characters long.");
      return;
    }
    if (!emailTrimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!emailRegex.test(emailTrimmed)) {
      setError("Please enter a valid email address (e.g., name@example.com).");
      return;
    }
    if (emailStatus === 'checking') {
      setError("Please wait while we check email availability.");
      return;
    }
    if (emailStatus === 'unavailable') {
      setError("This email address is already registered.");
      return;
    }
    if (emailStatus === 'idle') {
      try {
        const result = await checkEmail(emailTrimmed);
        if (!result.available) {
          setEmailStatus('unavailable');
          setError("This email address is already registered.");
          return;
        }
        setEmailStatus('available');
      } catch {
        // If check fails, proceed anyway — backend will catch duplicates
      }
    }
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError(
        "Password is too weak. It must contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @, #, $, etc.)."
      );
      return;
    }

    setLoading(true);

    try {
      setStatusText("Creating account...");
      const { user: registeredUser, tokens } = await register(emailTrimmed, password, nameTrimmed);

      tokensRef.current = tokens;
      registeredUserRef.current = registeredUser;
      let finalUser = registeredUser;
      let usedDefaultAvatar = false;

      if (avatarFile) {
        setIsUploading(true);

        const ext = avatarFile.name.split(".").pop() || "png";
        const objectKey = `users/avatars/${registeredUser.id}-${Date.now()}.${ext}`;

        const presignRes = await fetch(`${API_BASE}/files/presign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokens.access_token}`,
          },
          body: JSON.stringify({
            object_key: objectKey,
            content_type: avatarFile.type,
          }),
        });

        if (!presignRes.ok) {
          setAvatarWarning("Profile Image Upload service is unavailable, use default profile image for now you can change it from profile section later.");
          setIsUploading(false);
          usedDefaultAvatar = true;
        } else {
          const presignData = await presignRes.json();

          const uploadUrl = presignData.data?.upload_url || presignData.upload_url;
          const publicUrl = presignData.data?.public_url || presignData.public_url ||
            `https://gnovium.s3.ap-south-1.amazonaws.com/${objectKey}`;

          if (!uploadUrl) {
            setAvatarWarning("Profile Image Upload service is unavailable, use default profile image for now you can change it from profile section later.");
            setIsUploading(false);
            usedDefaultAvatar = true;
          } else {
            try {
              await uploadFileWithProgress(uploadUrl, avatarFile, (pct) => {
                setUploadProgress(pct);
              });

              const updateRes = await fetch(`${API_BASE}/auth/me`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${tokens.access_token}`,
                },
                body: JSON.stringify({ avatar_url: publicUrl }),
              });

              if (updateRes.ok) {
                const updateData = await updateRes.json();
                finalUser = updateData.data;
                setUploadSucceeded(true);
              }
            } catch {
              usedDefaultAvatar = true;
              setIsUploading(false);
            }
          }
        }

        setIsUploading(false);
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "local-app") {
        const authData = encodeURIComponent(JSON.stringify({ access_token: tokensRef.current!.access_token, refresh_token: tokensRef.current!.refresh_token, user: finalUser }));
        window.location.href = `/auth/local-app/callback?auth=${authData}`;
        return;
      }

      setStatusText("Signing in...");
      loginSession(finalUser, tokensRef.current);
      router.push(usedDefaultAvatar ? "/?notice=avatar_default" : "/");
    } catch (err: any) {
      let friendlyMsg = err.message || "An unexpected error occurred.";
      if (friendlyMsg.includes("Email is already registered") || friendlyMsg.includes("409") || friendlyMsg.toLowerCase().includes("conflict")) {
        friendlyMsg = "This email address is already registered. If you already have an account, please sign in.";
      } else if (friendlyMsg.includes("Failed to fetch") || friendlyMsg.toLowerCase().includes("networkerror")) {
        friendlyMsg = "Network connection failed. Please check your internet connection and try again.";
      }
      setError(friendlyMsg);
    } finally {
      setLoading(false);
      setStatusText("");
      setIsUploading(false);
    }
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
            NEW IDENTITY · REGISTRATION PORTAL
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 16 }}
            className="text-3xl sm:text-4xl font-black font-mono uppercase tracking-tight text-[var(--foreground)]"
          >
            Create Account
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 100, damping: 16 }}
            className="text-xs text-[var(--muted)] font-mono font-bold mt-2"
          >
            Join the knowledge operating system
          </motion.p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--card-bg)] border-[3px] border-[var(--foreground)] p-6 sm:p-10 hero-depth relative"
        >
          <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />

          <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
            {/* Avatar Selector */}
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-22 h-22 border-2 border-[var(--foreground)] bg-[var(--sunken-bg)] shadow-[4px_4px_0px_0px_var(--shadow-color)] rounded-none shrink-0 overflow-hidden cursor-pointer group hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_var(--shadow-color)] transition-all flex items-center justify-center bg-[var(--card-bg)]"
                  title="Click to select profile photo"
                >
                  {showDefaultAvatar ? (
                    <svg viewBox="0 0 100 100" className="w-full h-full p-4" fill="none">
                      <circle cx="50" cy="38" r="18" stroke="var(--muted)" strokeWidth="2.5" />
                      <path d="M18 85 C18 65 32 55 50 55 C68 55 82 65 82 85" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <img
                      src={getDisplayAvatar()}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                    <Upload className="w-5 h-5 text-white mb-1" />
                    <span className="text-[7px] text-white font-mono font-black uppercase">Upload</span>
                  </div>
                </motion.div>

                {/* Remove avatar button */}
                {(avatarFile || avatarPreview) && (
                  <motion.button
                    type="button"
                    onClick={handleRemoveAvatar}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-2 -right-2 p-1.5 border-2 border-rose-500 bg-rose-500 text-white rounded-none shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer z-20"
                    title="Remove profile photo"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                  </motion.button>
                )}
              </div>

              <span className="text-[8px] font-black font-mono uppercase text-[var(--muted)] tracking-wider mt-3">
                {avatarFile ? "Profile photo selected" : "Default avatar"}
              </span>

              {/* Upload Progress Bar */}
              {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-[180px] mt-3"
                >
                  <div className="flex justify-between font-mono text-[8px] font-black uppercase tracking-wider text-[var(--muted)] mb-1">
                    <span>Uploading</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[var(--sunken-bg)] border-2 border-[var(--foreground)] overflow-hidden h-3 rounded-none">
                    <motion.div
                      className="h-full bg-[var(--foreground)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </motion.div>
              )}

              {!isUploading && uploadProgress === 100 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 mt-2 text-emerald-500 font-mono text-[8px] font-black uppercase tracking-wider"
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Upload complete</span>
                </motion.div>
              )}

              {avatarWarning && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-2 border-2 border-amber-500 bg-amber-500/10 font-mono text-[8px] font-bold text-amber-500 text-center max-w-[250px]"
                >
                  {avatarWarning}
                </motion.div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            <div>
              <label
                htmlFor="name"
                className="block text-[10px] font-black font-mono uppercase tracking-widest text-[var(--foreground)] mb-2"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] px-3 py-3 text-xs font-mono text-[var(--foreground)] outline-none transition-all focus:bg-[var(--code-bg)] focus:shadow-[3px_3px_0px_0px_var(--shadow-color)] hover:border-[var(--foreground)]"
                placeholder="John Doe"
              />
            </div>

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailStatus !== 'idle') setEmailStatus('idle');
                }}
                onBlur={handleEmailBlur}
                className="block w-full rounded-none border-2 border-[var(--foreground)] bg-[var(--card-bg)] px-3 py-3 text-xs font-mono text-[var(--foreground)] outline-none transition-all focus:bg-[var(--code-bg)] focus:shadow-[3px_3px_0px_0px_var(--shadow-color)] hover:border-[var(--foreground)]"
                placeholder="name@example.com"
              />

              {emailStatus === 'checking' && (
                <p className="mt-1 text-[9px] font-mono font-bold text-[var(--muted)]">Checking availability...</p>
              )}
              {emailStatus === 'available' && (
                <p className="mt-1 text-[9px] font-mono font-bold text-emerald-500">Email is available</p>
              )}
              {emailStatus === 'unavailable' && (
                <p className="mt-1 text-[9px] font-mono font-bold text-rose-500">This email is already registered</p>
              )}
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
                  autoComplete="new-password"
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
                disabled={loading || emailStatus === 'checking'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-center font-mono text-xs font-black uppercase tracking-wider py-3.5 border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] neo-depth-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                    <span>{statusText || "Creating account..."}</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <Sparkles size={14} strokeWidth={2.5} />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs font-mono text-[var(--muted)]">
            Already have an account?{" "}
            <Link
               href={Routes.cloudWeb.signIn.build({})}
              className="font-black text-[var(--foreground)] border-b-2 border-[var(--foreground)] pb-0.5 hover:opacity-80 transition-opacity"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
