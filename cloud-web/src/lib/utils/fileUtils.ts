import {
  File,
  FileImage,
  FileText,
  FileVideo,
  FileAudio,
  FileCode,
} from "lucide-react";

const FILE_ICONS: Record<string, React.ElementType> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  text: FileText,
  application: File,
  code: FileCode,
};

export function getFileIcon(mimeType: string): React.ElementType {
  const type = mimeType.split("/")[0];
  return FILE_ICONS[type] || File;
}

export function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "text-purple-400";
  if (mimeType.startsWith("video/")) return "text-red-400";
  if (mimeType.startsWith("audio/")) return "text-amber-400";
  if (mimeType.includes("pdf")) return "text-red-400";
  if (mimeType.includes("json") || mimeType.includes("code")) return "text-green-400";
  if (mimeType.includes("zip")) return "text-blue-400";
  return "text-muted";
}
