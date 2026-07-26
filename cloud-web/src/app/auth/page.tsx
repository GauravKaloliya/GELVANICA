"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import gnoviumLogo from "@gnovium/shared/assets/logo/logo.png";
import Image from "next/image";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const query = source ? `?source=${source}` : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 grid-bg">
      <div className="relative h-16 w-16 mb-8">
        <Image src={gnoviumLogo} alt="Gnovium" fill className="object-contain" />
      </div>
      <h1 className="text-2xl font-black font-mono uppercase text-white mb-2 display-heading">Gnovium</h1>
      <p className="text-step-1 text-muted font-mono mb-8">Knowledge Operating System</p>
      <div className="flex gap-4">
        <Link href={`/auth/sign-in${query}`} className="rounded-lg bg-card px-6 py-2 text-sm font-semibold text-foreground hover:bg-surface transition-colors">
          Sign In
        </Link>
        <Link href={`/auth/sign-up${query}`} className="rounded-lg border border-border px-6 py-2 text-sm font-semibold text-foreground hover:bg-surface transition-colors">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
