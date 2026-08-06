import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { LessonInteractiveStep } from "@/lib/types";
import YouTubeIframe from "@/components/YouTubeIframe";
import MovePicker from "@/components/MovePicker";
import { Plus, Trash2, GripVertical, Loader2, Save, Youtube, Eye, Scissors, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

interface StepInput {
  id: string;
  lesson_id: string;
  fen: string;
  correct_san: string;
  prompt: string;
  pause_at_seconds: number;
  video_start_seconds: number;
  video_end_seconds: number;
  congrats_video_url: string;
  congrats_start_seconds: number;
  congrats_end_seconds: number;
  explanation_video_url: string;
  explanation_start_seconds: number;
  explanation_end_seconds: number;
  order_index: number;
  created_at: string;
}

export default function InteractiveLessonEditor({ lessonId, mainVideoUrl }: { lessonId: string; mainVideoUrl?: string }) {
  const [steps, setSteps] = useState<StepInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("lesson_interactive_steps")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });
    setSteps((data as StepInput[]) ?? []);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  function addStep() {
    setSteps([...steps, {
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      fen: DEFAULT_FEN,
      correct_san: "",
      prompt: "What's the best move?",
      pause_at_seconds: 0,
      video_start_seconds: 0,
      video_end_seconds: 0,
      congrats_video_url: "",
      congrats_start_seconds: 0,
      congrats_end_seconds: 0,
      explanation_video_url: "",
      explanation_start_seconds: 0,
      explanation_end_seconds: 0,
      order_index: steps.length,
      created_at: new Date().toISOString(),
    }]);
  }

  function updateStep(idx: number, field: keyof StepInput, value: string | number) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const copy = [...steps];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    copy.forEach((s, i) => s.order_index = i);
    setSteps(copy);
  }

  async function saveAll() {
    setSaving(true);
    await supabase.from("lesson_interactive_steps").delete().eq("lesson_id", lessonId);
    if (steps.length > 0) {
      const rows = steps.map((s, i) => ({
        lesson_id: lessonId,
        fen: s.fen,
        correct_san: s.correct_san,
        prompt: s.prompt || "What's the best move?",
        pause_at_seconds: s.video_end_seconds || 0,
        video_start_seconds: s.video_start_seconds || 0,
        video_end_seconds: s.video_end_seconds || 0,
        congrats_video_url: s.congrats_video_url || null,
        congrats_start_seconds: s.congrats_start_seconds || 0,
        congrats_end_seconds: s.congrats_end_seconds || 0,
        explanation_video_url: s.explanation_video_url || null,
        explanation_start_seconds: s.explanation_start_seconds || 0,
        explanation_end_seconds: s.explanation_end_seconds || 0,
        order_index: i,
      }));
      await supabase.from("lesson_interactive_steps").insert(rows);
    }
    setSaving(false);
    load();
  }

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-surface-500">
        Add checkpoints to your video lesson. Set the start and end times for the main video segment — the video will play from start to end, then pause and show the quiz.
        On a correct answer, an optional congrats video plays (with its own start/end times). On a wrong answer, an explanation video plays (with its own start/end times).
      </p>

      {steps.map((s, idx) => (
        <div key={s.id} className="bg-white rounded-lg border border-surface-200 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="text-surface-300 hover:text-primary-600 disabled:opacity-30 text-xs"><ChevronUp className="w-3.5 h-3.5" /></button>
              <GripVertical className="w-4 h-4 text-surface-300" />
              <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="text-surface-300 hover:text-primary-600 disabled:opacity-30 text-xs"><ChevronDown className="w-3.5 h-3.5" /></button>
            </div>
            <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">{idx + 1}</span>
            <button onClick={() => setPreviewStep(previewStep === idx ? null : idx)}
              className="ml-auto flex items-center gap-1 text-sm text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition">
              <Eye className="w-3.5 h-3.5" /> {previewStep === idx ? "Hide Preview" : "Preview Video"}
            </button>
            <button onClick={() => removeStep(idx)} className="p-1.5 rounded-lg text-surface-400 hover:bg-error-50 hover:text-error-600 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Video preview */}
          {previewStep === idx && (
            <VideoPreview
              mainVideoUrl={mainVideoUrl}
              step={s}
              onUpdate={(field, value) => updateStep(idx, field, value)}
            />
          )}

          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">FEN Position</label>
            <input value={s.fen} onChange={(e) => updateStep(idx, "fen", e.target.value)}
              placeholder={DEFAULT_FEN}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm font-mono outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-600 mb-2">Play the correct move on the board</label>
            <MovePicker
              fen={s.fen}
              correctSan={s.correct_san}
              onMove={(san) => updateStep(idx, "correct_san", san)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Prompt / Question</label>
            <input value={s.prompt} onChange={(e) => updateStep(idx, "prompt", e.target.value)}
              placeholder="What's the best move?"
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
          </div>

          {/* Main video start/end */}
          <div className="bg-surface-50 rounded-lg p-2.5 space-y-2">
            <p className="text-xs font-semibold text-surface-700 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-error-500" /> Main Video Segment
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-surface-500 mb-0.5">Start (sec)</label>
                <input type="number" value={s.video_start_seconds} onChange={(e) => updateStep(idx, "video_start_seconds", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-0.5">End / Pause At (sec)</label>
                <input type="number" value={s.video_end_seconds} onChange={(e) => updateStep(idx, "video_end_seconds", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
              </div>
            </div>
          </div>

          {/* Congrats video */}
          <div className="bg-success-50/50 rounded-lg p-2.5 space-y-2">
            <p className="text-xs font-semibold text-success-700 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-success-600" /> Congrats Video (optional, plays on correct answer)
            </p>
            <input value={s.congrats_video_url ?? ""} onChange={(e) => updateStep(idx, "congrats_video_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
            {s.congrats_video_url && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-surface-500 mb-0.5">Start (sec)</label>
                  <input type="number" value={s.congrats_start_seconds} onChange={(e) => updateStep(idx, "congrats_start_seconds", parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-xs text-surface-500 mb-0.5">End (sec)</label>
                  <input type="number" value={s.congrats_end_seconds} onChange={(e) => updateStep(idx, "congrats_end_seconds", parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
                </div>
              </div>
            )}
          </div>

          {/* Explanation video */}
          <div className="bg-error-50/50 rounded-lg p-2.5 space-y-2">
            <p className="text-xs font-semibold text-error-700 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-error-500" /> Explanation Video (optional, plays on wrong answer)
            </p>
            <input value={s.explanation_video_url ?? ""} onChange={(e) => updateStep(idx, "explanation_video_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
            {s.explanation_video_url && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-surface-500 mb-0.5">Start (sec)</label>
                  <input type="number" value={s.explanation_start_seconds} onChange={(e) => updateStep(idx, "explanation_start_seconds", parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-xs text-surface-500 mb-0.5">End (sec)</label>
                  <input type="number" value={s.explanation_end_seconds} onChange={(e) => updateStep(idx, "explanation_end_seconds", parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={addStep}
          className="flex items-center gap-1.5 text-sm text-primary-600 px-3 py-2 rounded-lg border border-primary-200 hover:bg-primary-50 transition">
          <Plus className="w-4 h-4" /> Add Checkpoint
        </button>
        <button onClick={saveAll} disabled={saving}
          className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition ml-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Steps
        </button>
      </div>
      {steps.length === 0 && (
        <p className="text-xs text-surface-400 text-center py-2">No checkpoints yet. Click "Add Checkpoint" to create one.</p>
      )}
    </div>
  );
}

// Video preview component with time tracking and set-start/set-end buttons
function VideoPreview({ mainVideoUrl, step, onUpdate }: {
  mainVideoUrl?: string;
  step: StepInput;
  onUpdate: (field: keyof StepInput, value: string | number) => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [activeVideo, setActiveVideo] = useState<"main" | "congrats" | "explanation">("main");

  const videoUrl = activeVideo === "main" ? mainVideoUrl :
    activeVideo === "congrats" ? step.congrats_video_url :
    step.explanation_video_url;

  const startField = activeVideo === "main" ? "video_start_seconds" :
    activeVideo === "congrats" ? "congrats_start_seconds" :
    "explanation_start_seconds";

  const endField = activeVideo === "main" ? "video_end_seconds" :
    activeVideo === "congrats" ? "congrats_end_seconds" :
    "explanation_end_seconds";

  const startVal = step[startField] as number;
  const endVal = step[endField] as number;

  return (
    <div className="bg-black rounded-lg p-3 space-y-2">
      {/* Video selector tabs */}
      <div className="flex gap-1.5">
        <button onClick={() => setActiveVideo("main")}
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${activeVideo === "main" ? "bg-primary-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
          Main Video
        </button>
        {step.congrats_video_url && (
          <button onClick={() => setActiveVideo("congrats")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${activeVideo === "congrats" ? "bg-success-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
            Congrats
          </button>
        )}
        {step.explanation_video_url && (
          <button onClick={() => setActiveVideo("explanation")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${activeVideo === "explanation" ? "bg-error-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
            Explanation
          </button>
        )}
      </div>

      {videoUrl ? (
        <>
          <div className="aspect-video rounded-md overflow-hidden">
            <YouTubeIframe
              key={activeVideo}
              url={videoUrl}
              startSeconds={startVal}
              endSeconds={endVal}
              onTimeUpdate={(t) => setCurrentTime(t)}
              onEnd={() => {}}
              className="w-full h-full"
            />
          </div>

          {/* Time display + set buttons */}
          <div className="flex items-center gap-2 text-white text-xs">
            <span className="font-mono bg-white/10 px-2 py-1 rounded">
              {formatTime(currentTime)}
            </span>
            <button onClick={() => onUpdate(startField, Math.floor(currentTime))}
              className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 px-2.5 py-1 rounded-md transition">
              <Scissors className="w-3 h-3" /> Set Start = {formatTime(Math.floor(currentTime))}
            </button>
            <button onClick={() => onUpdate(endField, Math.floor(currentTime))}
              className="flex items-center gap-1 bg-error-600 hover:bg-error-700 px-2.5 py-1 rounded-md transition">
              <Scissors className="w-3 h-3" /> Set End = {formatTime(Math.floor(currentTime))}
            </button>
          </div>

          {/* Current segment display */}
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <span>Segment: {formatTime(startVal)} → {endVal > 0 ? formatTime(endVal) : "end"}</span>
            {startVal > 0 && (
              <button onClick={() => onUpdate(startField, 0)} className="text-white/50 hover:text-white">reset start</button>
            )}
            {endVal > 0 && (
              <button onClick={() => onUpdate(endField, 0)} className="text-white/50 hover:text-white">reset end</button>
            )}
          </div>
        </>
      ) : (
        <div className="aspect-video flex items-center justify-center text-white/40 text-sm">
          {activeVideo === "main" ? "Enter a main video URL in the lesson settings above" :
            activeVideo === "congrats" ? "Enter a congrats video URL below" :
            "Enter an explanation video URL below"}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
