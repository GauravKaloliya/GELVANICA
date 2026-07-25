import { DICEBEAR_URL } from "../config/constants";

export function getAvatarUrl(seed: string): string {
  const s = seed?.trim() || "default";
  return `${DICEBEAR_URL}?seed=${encodeURIComponent(s)}`;
}
