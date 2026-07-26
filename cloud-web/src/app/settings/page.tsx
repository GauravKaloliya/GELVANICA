"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/session"
import { useAuthStore } from "@/stores/authStore"
import { apiClient } from "@/lib/apiClient"
import { ArrowLeft, LogOut, Trash2, Shield } from "lucide-react"
import Link from "next/link"

export default function GlobalSettingsPage() {
  const router = useRouter()
  const { user } = useSession()
  const { tokens, logout } = useAuthStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    document.title = 'Settings | Gnovium'
  }, [])

  const handleDeleteAccount = async () => {
    if (!tokens?.access_token) return
    try {
      await apiClient.delete("/auth/me", tokens.access_token)
      logout()
router.push("/auth/sign-in")
    } catch {
      /* handle error */
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground display-heading">Settings</h1>
      </div>

      {/* Account */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 display-heading">
          <Shield className="h-5 w-5 text-muted" />
          Account
        </h2>
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div>
            <p className="text-step-3 text-muted">Email</p>
            <p className="text-step-3 text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-step-3 text-muted">Account Created</p>
            <p className="text-step-3 text-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <Link
            href="/profile"
            className="inline-block text-sm text-blue-400 hover:text-blue-300"
          >
            Edit Profile →
          </Link>
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground display-heading">Appearance</h2>
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <p className="text-step-3 text-muted">
            Theme is controlled via the theme toggle in the top navigation bar.
          </p>
        </div>
      </section>

      {/* Sign Out */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground display-heading">Session</h2>
        <button
          onClick={() => { logout(); router.push("/auth") }}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:border-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-red-400 display-heading">Danger Zone</h2>
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-5 space-y-3">
          <p className="text-sm text-muted">
            Account deletion is permanent and cannot be undone. All your data will be removed.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-red-800 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-foreground hover:bg-red-700"
              >
                Confirm Deletion
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
