export function getAvatarUrl(seed: string): string {
  const s = seed?.trim() || "default"
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(s)}`
}
