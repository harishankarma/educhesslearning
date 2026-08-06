import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { LessonPuzzle } from "@/lib/types";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Loader2, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

type Status = "playing" | "correct" | "wrong" | "done";

export default function PuzzleSolver({ lessonId, onComplete }: { lessonId: string; onComplete?: () => void }) {
  const [puzzles, setPuzzles] = useState<LessonPuzzle[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [status, setStatus] = useState<Status>("playing");
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [attemptedThisPuzzle, setAttemptedThisPuzzle] = useState(false);
  const chessRef = useRef(new Chess());

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

  useEffect(() => {
    const p = puzzles[currentIdx];
    if (p) {
      try {
        chessRef.current = new Chess(p.fen);
      } catch {
        chessRef.current = new Chess();
      }
      setStatus("playing");
      setAttemptedThisPuzzle(false);
    }
  }, [currentIdx, puzzles]);

  function onDrop(sourceSquare: string, targetSquare: string): boolean {
    if (status === "correct" || status === "wrong" || status === "done") return false;
    const chess = chessRef.current;
    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;

      const puzzle = puzzles[currentIdx];
      if (move.san === puzzle.correct_san) {
        setStatus("correct");
        if (!attemptedThisPuzzle) setCorrectCount((c) => c + 1);
      } else {
        setStatus("wrong");
        if (!attemptedThisPuzzle) setWrongCount((c) => c + 1);
        setAttemptedThisPuzzle(true);
      }
      return true;
    } catch {
      return false;
    }
  }

  function retry() {
    const p = puzzles[currentIdx];
    if (p) {
      try {
        chessRef.current = new Chess(p.fen);
      } catch {
        chessRef.current = new Chess();
      }
      setStatus("playing");
    }
  }

  function nextPuzzle() {
    if (currentIdx + 1 >= puzzles.length) {
      setStatus("done");
      onComplete?.();
      return;
    }
    setCurrentIdx((i) => i + 1);
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  if (puzzles.length === 0) {
    return <p className="text-center text-surface-400 py-8">No puzzles in this lesson yet.</p>;
  }

  if (status === "done") {
    return (
      <div className="text-center py-8 space-y-4">
        <Trophy className="w-16 h-16 mx-auto text-warning-500" />
        <h3 className="text-xl font-bold text-surface-900">Puzzle Set Complete!</h3>
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-success-600">{correctCount}</p>
            <p className="text-sm text-surface-500">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-error-500">{wrongCount}</p>
            <p className="text-sm text-surface-500">Wrong</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-surface-700">{puzzles.length}</p>
            <p className="text-sm text-surface-500">Total Puzzles</p>
          </div>
        </div>
        <button onClick={() => { setCurrentIdx(0); setCorrectCount(0); setWrongCount(0); setStatus("playing"); }}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const puzzle = puzzles[currentIdx];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-700">Puzzle {currentIdx + 1} of {puzzles.length}</span>
        <div className="flex gap-3 text-sm">
          <span className="text-success-600 font-medium">{correctCount} correct</span>
          <span className="text-error-500 font-medium">{wrongCount} wrong</span>
        </div>
      </div>

      <div className="w-[min(100vw-3rem,420px)] aspect-square mx-auto">
        <Chessboard
          position={chessRef.current.fen()}
          onPieceDrop={onDrop}
          customBoardStyle={{ borderRadius: "8px", overflow: "hidden" }}
          customDarkSquareStyle={{ backgroundColor: "#b58863" }}
          customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
        />
      </div>

      {status === "playing" && (
        <p className="text-center text-sm text-surface-500">Find the best move for this position.</p>
      )}

      {status === "correct" && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-success-700">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-semibold text-lg">Correct! Well done.</span>
          </div>
          <button onClick={nextPuzzle}
            className="bg-success-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-success-700 transition">
            {currentIdx + 1 >= puzzles.length ? "Finish" : "Next Puzzle"}
          </button>
        </div>
      )}

      {status === "wrong" && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-error-700">
            <XCircle className="w-6 h-6" />
            <span className="font-semibold text-lg">Not quite! Try again.</span>
          </div>
          <button onClick={retry}
            className="inline-flex items-center gap-2 bg-error-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-error-700 transition">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
