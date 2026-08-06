import { useState, useRef, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { RotateCcw, Check } from "lucide-react";

/**
 * Lets a coach set the correct move by playing it on the board.
 * Calls onMove with the SAN string whenever a legal move is made.
 */
export default function MovePicker({
  fen,
  correctSan,
  onMove,
}: {
  fen: string;
  correctSan: string;
  onMove: (san: string) => void;
}) {
  const chessRef = useRef(new Chess());
  const [boardFen, setBoardFen] = useState(fen);

  // Reset board when FEN changes
  useEffect(() => {
    try {
      chessRef.current = new Chess(fen);
    } catch {
      chessRef.current = new Chess();
    }
    setBoardFen(chessRef.current.fen());
  }, [fen]);

  function onDrop(sourceSquare: string, targetSquare: string): boolean {
    const chess = chessRef.current;
    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;
      setBoardFen(chess.fen());
      onMove(move.san);
      return true;
    } catch {
      return false;
    }
  }

  function reset() {
    try {
      chessRef.current = new Chess(fen);
    } catch {
      chessRef.current = new Chess();
    }
    setBoardFen(chessRef.current.fen());
  }

  return (
    <div className="space-y-2">
      <div className="w-[min(100vw-5rem,360px)] aspect-square mx-auto">
        <Chessboard
          position={boardFen}
          onPieceDrop={onDrop}
          customBoardStyle={{ borderRadius: "8px", overflow: "hidden" }}
          customDarkSquareStyle={{ backgroundColor: "#b58863" }}
          customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
        />
      </div>
      <div className="flex items-center justify-center gap-3">
        {correctSan ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-700 bg-success-50 px-3 py-1.5 rounded-lg">
            <Check className="w-4 h-4" /> Correct move: {correctSan}
          </span>
        ) : (
          <span className="text-sm text-surface-500">Play the correct move on the board</span>
        )}
        <button onClick={reset}
          className="inline-flex items-center gap-1.5 text-sm text-surface-600 px-3 py-1.5 rounded-lg border border-surface-200 hover:bg-surface-50 transition">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}
