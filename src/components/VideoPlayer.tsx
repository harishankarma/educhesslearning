import { getYouTubeId, isVideoUrl } from "@/lib/utils";
import { Play, FileVideo } from "lucide-react";

export default function VideoPlayer({ url, title }: { url: string; title?: string }) {
  if (!url || !url.trim()) {
    return (
      <div className="bg-surface-100 rounded-xl p-8 text-center text-surface-400">
        <FileVideo className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No video attached to this lesson.</p>
      </div>
    );
  }

  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-lg">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title={title ?? "Lesson video"}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVideoUrl(url)) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-lg">
        <video src={url} controls className="w-full h-full">
          <track kind="captions" />
        </video>
      </div>
    );
  }

  // Fallback: show as link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-primary-50 text-primary-700 rounded-xl px-5 py-4 hover:bg-primary-100 transition"
    >
      <Play className="w-5 h-5" />
      <span className="font-medium">Open video link</span>
    </a>
  );
}
