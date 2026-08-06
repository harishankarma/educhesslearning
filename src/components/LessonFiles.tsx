import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { LessonFile } from "@/lib/types";
import { Upload, Loader2, Trash2, FileText, ImageIcon, X } from "lucide-react";

interface Props {
  lessonId: string;
  editable: boolean;
}

export default function LessonFiles({ lessonId, editable }: Props) {
  const [files, setFiles] = useState<LessonFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("lesson_files")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    setFiles((data as LessonFile[]) ?? []);
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(file: File) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      alert("Only images and PDF files are supported.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "";
    const fileName = `${lessonId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("lesson-files")
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (uploadErr) {
      alert("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("lesson-files").getPublicUrl(fileName);

    const { error: dbErr } = await supabase.from("lesson_files").insert({
      lesson_id: lessonId,
      file_url: urlData.publicUrl,
      file_type: isImage ? "image" : "pdf",
      file_name: file.name,
    });

    if (dbErr) {
      alert("Failed to save file record: " + dbErr.message);
      await supabase.storage.from("lesson-files").remove([fileName]);
    }

    setUploading(false);
    load();
  }

  async function handleDelete(file: LessonFile) {
    if (!confirm(`Delete "${file.file_name}"?`)) return;
    const path = file.file_url.split("/lesson-files/")[1];
    if (path) await supabase.storage.from("lesson-files").remove([path]);
    await supabase.from("lesson_files").delete().eq("id", file.id);
    load();
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleUpload(file);
          }}
          className={`relative rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragOver ? "border-primary-400 bg-primary-50" : "border-surface-300 bg-surface-50"
          }`}
        >
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <p className="text-sm text-surface-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-surface-400" />
              <p className="text-sm text-surface-600 font-medium">Upload images or PDFs</p>
              <p className="text-xs text-surface-400">Drag & drop or click to browse</p>
            </div>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {files.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden group relative">
              {f.file_type === "image" ? (
                <a href={f.file_url} target="_blank" rel="noopener noreferrer">
                  <img src={f.file_url} alt={f.file_name} className="w-full max-h-64 object-contain bg-surface-50" />
                </a>
              ) : (
                <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center py-8 bg-surface-50 hover:bg-surface-100 transition">
                  <FileText className="w-12 h-12 text-error-500 mb-2" />
                  <p className="text-sm font-medium text-surface-700 truncate max-w-[200px]">{f.file_name}</p>
                  <p className="text-xs text-surface-400 mt-1">Click to view PDF</p>
                </a>
              )}
              <div className="px-4 py-2.5 flex items-center justify-between bg-white border-t border-surface-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  {f.file_type === "image" ? <ImageIcon className="w-3.5 h-3.5 text-surface-400" /> : <FileText className="w-3.5 h-3.5 text-surface-400" />}
                  <span className="text-xs text-surface-600 truncate">{f.file_name}</span>
                </div>
                {editable && (
                  <button onClick={() => handleDelete(f)}
                    className="p-1 rounded text-surface-400 hover:text-error-600 hover:bg-error-50 transition flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && !editable && (
        <p className="text-sm text-surface-400 text-center py-4">No files attached to this lesson.</p>
      )}
    </div>
  );
}
