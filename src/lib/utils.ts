export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (sameDay) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date}, ${time}`;
}

export function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes("youtube") || url.includes("youtu.be");
}

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];
const MAX_SIZE = 10 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE) return "File too large (max 10 MB).";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) return "Only PDF, JPG, and PNG files are allowed.";
  if (file.type && !ALLOWED.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
    return "Unsupported file type.";
  }
  return null;
}

export function getFileType(file: File): "pdf" | "image" {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "image";
}
