"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "@/lib/session"
import { apiClient } from "@/lib/apiClient"
import { getAvatarUrl } from "@/lib/utils/avatar"
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { user, tokens, updateUser } = useSession()
  const [name, setName] = useState(user?.name || "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Profile | Gnovium'
  }, [])

  if (!user) return null

  const handleSave = async () => {
    if (!tokens?.access_token) return
    setSaving(true)
    setMessage(null)
    try {
      const json = await apiClient.patch<{ data: { name: string } }>("/auth/me", { name })
      updateUser({ ...user, ...json.data })
      setMessage("Profile updated successfully")
    } catch {
      setMessage("Update failed")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tokens?.access_token) return
    setSaving(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploadJson = await apiClient.postFormData<{ data: { avatar_url: string } }>("/auth/avatar", formData, tokens.access_token)
      updateUser({ ...user, avatar_url: uploadJson.data.avatar_url })
      setMessage("Avatar updated")
    } catch {
      setMessage("Avatar upload failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground display-heading">Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatar_url || getAvatarUrl(user.name || user.email)}
            alt={user.name || "Avatar"}
            className="h-full w-full object-cover"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 hover:opacity-100 transition-opacity"
          >
            <Camera className="h-5 w-5 text-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <div>
          <p className="text-step-3 text-muted">{user.email}</p>
          <p className="text-step-1 text-muted">Member since {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="profile-display-name" className="text-sm font-medium text-foreground">Display Name</label>
        <input
          id="profile-display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          placeholder="Your name"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || name === (user.name || "")}
          className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
        {message && (
          <p className={`text-sm ${message.includes("fail") ? "text-red-400" : "text-emerald-400"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
