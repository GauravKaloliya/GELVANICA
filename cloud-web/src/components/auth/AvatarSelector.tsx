import { type RefObject } from "react";
import { Upload, Trash2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { DICEBEAR_URL } from "@/lib/config/constants";

interface AvatarSelectorProps {
  avatarFile: File | null;
  avatarPreview: string | null;
  name: string;
  isUploading: boolean;
  uploadProgress: number;
  uploadAttempt: number;
  avatarWarning: string | null;
  uploadSucceeded: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export default function AvatarSelector({
  avatarFile,
  avatarPreview,
  name,
  isUploading,
  uploadProgress,
  uploadAttempt,
  avatarWarning,
  onFileSelect,
  onRemoveAvatar,
  fileInputRef,
}: AvatarSelectorProps) {
  const getDisplayAvatar = () => {
    if (avatarPreview) return avatarPreview;
    if (name.trim()) return `${DICEBEAR_URL}?seed=${encodeURIComponent(name.trim())}`;
    return "";
  };

  const showDefaultAvatar = !avatarPreview && !name.trim();

  return (
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
            // eslint-disable-next-line @next/next/no-img-element
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

        {(avatarFile || avatarPreview) && (
          <motion.button
            type="button"
            onClick={onRemoveAvatar}
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

      {isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[180px] mt-3"
        >
          <div className="flex justify-between font-mono text-[8px] font-black uppercase tracking-wider text-[var(--muted)] mb-1">
            <span>{uploadAttempt > 1 ? `Retry ${uploadAttempt}/3` : "Uploading"}</span>
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
          className="mt-3 p-2 border-2 border-rose-500 bg-rose-500/10 font-mono text-[8px] font-bold text-rose-500 text-center max-w-[250px]"
        >
          {avatarWarning}
        </motion.div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
