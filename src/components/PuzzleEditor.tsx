import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { LessonPuzzle } from "@/lib/types";
import MovePicker from "@/components/MovePicker";
import { Plus, Trash2, GripVertical, Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function PuzzleEditor({ lessonId }: { lessonId: string }) {
  const [puzzles, setPuzzles] = useState<LessonPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPuzzle, setExpandedPuzzle] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("lesson_puzzles")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });
    setPuzzles((data as LessonPuzzle[]) ?? []);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  function addPuzzle() {
    const newIdx = puzzles.length;
    setPuzzles([...puzzles, {
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      fen: DEFAULT_FEN,
      correct_san: "",
      order_index: newIdx,
      created_at: new Date().toISOString(),
    }]);
    setExpandedPuzzle(newIdx);
  }

  function updatePuzzle(idx: number, field: keyof LessonPuzzle, value: string) {
    setPuzzles(puzzles.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function removePuzzle(idx: number) {
    setPuzzles(puzzles.filter((_, i) => i !== idx));
  }

  function movePuzzle(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= puzzles.length) return;
    const copy = [...puzzles];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    copy.forEach((p, i) => p.order_index = i);
    setPuzzles(copy);
  }

  async function saveAll() {
    setSaving(true);
    await supabase.from("lesson_puzzles").delete().eq("lesson_id", lessonId);
    if (puzzles.length > 0) {
      const rows = puzzles.map((p, i) => ({
        lesson_id: lessonId,
        fen: p.fen,
        correct_san: p.correct_san,
        order_index: i,
      }));
      await supabase.from("lesson_puzzles").insert(rows);
    }
    setSaving(false);
    load();
  }

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-3">
      {puzzles.map((p, idx) => (
        <div key={p.id} className="bg-white rounded-lg border border-surface-200 overflow-hidden">
          <div className="flex items-center gap-2 p-3">
            <div className="flex flex-col">
              <button onClick={() => movePuzzle(idx, -1)} disabled={idx === 0} className="text-surface-300 hover:text-primary-600 disabled:opacity-30 text-xs"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => movePuzzle(idx, 1)} disabled={idx === puzzles.length - 1} className="text-surface-300 hover:text-primary-600 disabled:opacity-30 text-xs"><ChevronDown className="w-3.5 h-3.5" /></button>
            </div>
            <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">{idx + 1}</span>
            <button onClick={() => setExpandedPuzzle(expandedPuzzle === idx ? null : idx)}
              className="text-sm font-medium text-surface-700 hover:text-primary-600 transition">
              {p.correct_san ? `Move: ${p.correct_san}` : "Set correct move"}
            </button>
            <button onClick={() => removePuzzle(idx)} className="ml-auto p-1.5 rounded-lg text-surface-400 hover:bg-error-50 hover:text-error-600 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {expandedPuzzle === idx && (
            <div className="px-3 pb-3 space-y-3 border-t border-surface-100 pt-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">FEN Position</label>
                <input value={p.fen} onChange={(e) => updatePuzzle(idx, "fen", e.target.value)}
                  placeholder={DEFAULT_FEN}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm font-mono outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-2">Play the correct move on the board</label>
                <MovePicker
                  fen={p.fen}
                  correctSan={p.correct_san}
                  onMove={(san) => updatePuzzle(idx, "correct_san", san)}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={addPuzzle}
          className="flex items-center gap-1.5 text-sm text-primary-600 px-3 py-2 rounded-lg border border-primary-200 hover:bg-primary-50 transition">
          <Plus className="w-4 h-4" /> Add Puzzle
        </button>
        <button onClick={saveAll} disabled={saving}
          className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition ml-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Puzzles
        </button>
      </div>
      {puzzles.length === 0 && (
        <p className="text-xs text-surface-400 text-center py-2">No puzzles yet. Click "Add Puzzle" to create one.</p>
      )}
    </div>
  );
}
