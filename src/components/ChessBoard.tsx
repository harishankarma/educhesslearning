import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { LessonMove } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Trash2, MessageSquare, X, Save, Eraser } from "lucide-react";

interface Props {
  lessonId: string;
  startFen: string;
  editable: boolean;
  onChanged?: () => void;
}

interface TreeNode {
  move: LessonMove;
  children: TreeNode[];
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function buildTree(moves: LessonMove[], parentId: string | null = null): TreeNode[] {
  return moves
    .filter((m) => (m.parent_id ?? null) === parentId)
    .sort((a, b) => a.order_index - b.order_index)
    .map((move) => ({ move, children: buildTree(moves, move.id) }));
}

function flattenMainline(node: TreeNode, all: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [node];
  if (node.children.length > 0) {
    result.push(...flattenMainline(node.children[0], all));
  }
  return result;
}

function findPath(moves: LessonMove[], targetId: string): LessonMove[] {
  const map = new Map(moves.map((m) => [m.id, m]));
  const path: LessonMove[] = [];
  let current: LessonMove | undefined = map.get(targetId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }
  return path;
}

export default function ChessBoard({ lessonId, startFen, editable, onChanged }: Props) {
  const [moves, setMoves] = useState<LessonMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [fen, setFen] = useState(startFen || START_FEN);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [moveOptions, setMoveOptions] = useState<{ from: string; to: string }[] | null>(null);
  const chessRef = useRef(new Chess(startFen || START_FEN));

  const baseFen = startFen || START_FEN;
  const tree = useMemo(() => buildTree(moves), [moves]);

  const loadMoves = useCallback(async () => {
    const { data } = await supabase
      .from("lesson_moves")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });
    setMoves((data as LessonMove[]) ?? []);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { loadMoves(); }, [loadMoves]);

  // Rebuild chess position when path changes
  useEffect(() => {
    const chess = new Chess(baseFen);
    for (const moveId of currentPath) {
      const m = moves.find((x) => x.id === moveId);
      if (m) chess.move(m.san);
    }
    chessRef.current = chess;
    setFen(chess.fen());
  }, [currentPath, moves, baseFen]);

  const pathMoves = currentPath.map((id) => moves.find((m) => m.id === id)).filter(Boolean) as LessonMove[];
  const currentMoveId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
  const currentMove = currentMoveId ? moves.find((m) => m.id === currentMoveId) : null;

  // Siblings at the current depth (variations)
  const siblings = useMemo(() => {
    if (currentPath.length === 0) return [];
    const parentId = currentMove?.parent_id ?? null;
    return moves.filter((m) => (m.parent_id ?? null) === parentId).sort((a, b) => a.order_index - b.order_index);
  }, [currentMove, moves, currentPath]);

  // Children of the current move (next moves available)
  const children = useMemo(() => {
    const parentId = currentMoveId ?? null;
    return moves.filter((m) => (m.parent_id ?? null) === parentId).sort((a, b) => a.order_index - b.order_index);
  }, [currentMoveId, moves]);

  async function onDrop(sourceSquare: Square, targetSquare: Square) {
    if (!editable) return false;
    const chess = chessRef.current;
    try {
      const moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!moveResult) return false;

      const parentId = currentMoveId;
      const newFen = chess.fen();
      const existingChild = moves.find(
        (m) => (m.parent_id ?? null) === (parentId ?? null) && m.san === moveResult.san
      );

      if (existingChild) {
        // Navigate to existing move
        const path = findPath(moves, existingChild.id);
        setCurrentPath(path.map((m) => m.id));
      } else {
        // Insert new move
        const orderIndex = moves.filter((m) => (m.parent_id ?? null) === (parentId ?? null)).length;
        const { data, error } = await supabase.from("lesson_moves").insert({
          lesson_id: lessonId,
          parent_id: parentId,
          san: moveResult.san,
          fen: newFen,
          ply: pathMoves.length,
          note: "",
          order_index: orderIndex,
        }).select().single();

        if (error) { chess.undo(); return false; }

        const newMove = data as LessonMove;
        const newMoves = [...moves, newMove];
        setMoves(newMoves);
        const path = findPath(newMoves, newMove.id);
        setCurrentPath(path.map((m) => m.id));
        onChanged?.();
      }
      return true;
    } catch {
      return false;
    }
  }

  function navigateToMove(moveId: string | null) {
    if (moveId === null) {
      setCurrentPath([]);
    } else {
      const path = findPath(moves, moveId);
      setCurrentPath(path.map((m) => m.id));
    }
  }

  function goBack() {
    if (currentPath.length === 0) return;
    setCurrentPath(currentPath.slice(0, -1));
  }

  function goForward() {
    if (children.length === 0) return;
    navigateToMove(children[0].id);
  }

  async function saveNote() {
    if (!currentMoveId || !currentMove) return;
    await supabase.from("lesson_moves").update({ note: noteDraft }).eq("id", currentMoveId);
    setMoves(moves.map((m) => (m.id === currentMoveId ? { ...m, note: noteDraft } : m)));
    setEditingNote(null);
    onChanged?.();
  }

  async function deleteVariation(moveId: string) {
    if (!confirm("Delete this move and all moves that follow it?")) return;
    // Collect all descendants
    const toDelete = new Set<string>([moveId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of moves) {
        if (m.parent_id && toDelete.has(m.parent_id) && !toDelete.has(m.id)) {
          toDelete.add(m.id);
          changed = true;
        }
      }
    }
    await supabase.from("lesson_moves").delete().in("id", Array.from(toDelete));
    const remaining = moves.filter((m) => !toDelete.has(m.id));
    setMoves(remaining);
    // Navigate to parent
    const parent = moves.find((m) => m.id === moveId)?.parent_id;
    if (parent) {
      const path = findPath(remaining, parent);
      setCurrentPath(path.map((m) => m.id));
    } else {
      setCurrentPath([]);
    }
    onChanged?.();
  }

  async function clearAllMoves() {
    if (moves.length === 0) return;
    if (!confirm("Delete ALL moves and variations from this lesson? This cannot be undone.")) return;
    await supabase.from("lesson_moves").delete().eq("lesson_id", lessonId);
    setMoves([]);
    setCurrentPath([]);
    onChanged?.();
  }

  if (loading) return <div className="flex justify-center py-8 text-surface-400">Loading board...</div>;

  return (
    <div className="space-y-4">
      {/* Board */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-shrink-0 mx-auto lg:mx-0">
          <div className="w-[min(100vw-3rem,420px)] aspect-square">
            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={orientation}
              customBoardStyle={{ borderRadius: "8px", overflow: "hidden" }}
              customDarkSquareStyle={{ backgroundColor: "#b58863" }}
              customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
            />
          </div>
          <div className="flex items-center gap-2 mt-3 justify-center">
            <button onClick={goBack} disabled={currentPath.length === 0}
              className="p-2 rounded-lg bg-white border border-surface-200 hover:bg-surface-50 disabled:opacity-40 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goForward} disabled={children.length === 0}
              className="p-2 rounded-lg bg-white border border-surface-200 hover:bg-surface-50 disabled:opacity-40 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
              className="p-2 rounded-lg bg-white border border-surface-200 hover:bg-surface-50 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => navigateToMove(null)}
              className="px-3 py-2 rounded-lg bg-white border border-surface-200 hover:bg-surface-50 text-xs font-medium transition">
              Start
            </button>
            {editable && moves.length > 0 && (
              <button onClick={clearAllMoves}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-error-50 border border-error-200 text-error-600 hover:bg-error-100 text-xs font-medium transition ml-2">
                <Eraser className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Move list + notes panel */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Move list */}
          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-surface-900">Move Tree</h3>
              {editable && moves.length > 0 && (
                <button onClick={clearAllMoves}
                  className="flex items-center gap-1 text-xs text-error-600 hover:text-error-700 font-medium transition">
                  <Eraser className="w-3.5 h-3.5" /> Clear All Moves
                </button>
              )}
            </div>
            <MoveTree
              tree={tree}
              currentPath={currentPath}
              onNavigate={navigateToMove}
              editable={editable}
              onDelete={deleteVariation}
            />
            {moves.length === 0 && (
              <p className="text-xs text-surface-400 text-center py-4">
                {editable ? "Make moves on the board to build your lesson." : "No moves in this lesson."}
              </p>
            )}
          </div>

          {/* Notes */}
          {currentMove && (
            <div className="bg-white rounded-xl border border-surface-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary-600" /> Notes for {currentMove.san}
                </h3>
                {editable && editingNote !== currentMove.id && (
                  <button onClick={() => { setEditingNote(currentMove.id); setNoteDraft(currentMove.note); }}
                    className="text-xs text-primary-600 hover:underline">Edit</button>
                )}
              </div>
              {editingNote === currentMove.id ? (
                <div className="space-y-2">
                  <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm resize-y"
                    placeholder="Add notes about this position..." />
                  <div className="flex gap-2">
                    <button onClick={saveNote}
                      className="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => setEditingNote(null)}
                      className="flex items-center gap-1.5 text-surface-600 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-50 transition">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-surface-700 whitespace-pre-wrap">
                  {currentMove.note || <span className="text-surface-400 italic">No notes for this move.</span>}
                </p>
              )}
            </div>
          )}

          {/* Variation selector */}
          {siblings.length > 1 && (
            <div className="bg-white rounded-xl border border-surface-200 p-4">
              <h3 className="text-sm font-semibold text-surface-900 mb-2">Variations at this move</h3>
              <div className="flex flex-wrap gap-2">
                {siblings.map((s, i) => (
                  <button key={s.id} onClick={() => navigateToMove(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      s.id === currentMoveId
                        ? "bg-primary-600 text-white"
                        : "bg-surface-100 text-surface-700 hover:bg-surface-200"
                    }`}>
                    {i === 0 ? s.san : `${s.san} (alt)`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MoveTree({
  tree, currentPath, onNavigate, editable, onDelete, depth = 0,
}: {
  tree: TreeNode[];
  currentPath: string[];
  onNavigate: (id: string | null) => void;
  editable: boolean;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "ml-4 border-l border-surface-200 pl-2" : "space-y-0.5"}>
      {tree.map((node, i) => {
        const isActive = currentPath.includes(node.move.id);
        const isCurrent = currentPath[currentPath.length - 1] === node.move.id;
        return (
          <div key={node.move.id}>
            <div className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition group ${
              isCurrent ? "bg-primary-100" : isActive ? "bg-primary-50" : "hover:bg-surface-50"
            }`}>
              <button onClick={() => onNavigate(node.move.id)}
                className="flex items-center gap-1.5 text-sm flex-1 text-left">
                {depth === 0 && i === 0 && <span className="text-xs text-surface-400">{Math.floor(node.move.ply / 2) + 1}.</span>}
                {depth === 0 && i > 0 && <span className="text-xs text-surface-400">{Math.floor(node.move.ply / 2) + 1}...</span>}
                <span className={`font-mono ${isActive ? "text-primary-700 font-semibold" : "text-surface-700"}`}>
                  {node.move.san}
                </span>
                {node.move.note && <MessageSquare className="w-3 h-3 text-surface-400" />}
              </button>
              {editable && (
                <button onClick={() => onDelete(node.move.id)}
                  className="p-1 rounded text-surface-400 hover:text-error-600 hover:bg-error-50 transition"
                  title="Delete this move and all following">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {node.children.length > 0 && (
              <MoveTree tree={node.children} currentPath={currentPath} onNavigate={onNavigate}
                editable={editable} onDelete={onDelete} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}
