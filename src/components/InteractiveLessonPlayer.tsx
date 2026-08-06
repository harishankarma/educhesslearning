import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { LessonInteractiveStep } from "@/lib/types";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import YouTubeIframe from "@/components/YouTubeIframe";
import { Loader2, CheckCircle2, XCircle, RotateCcw, Trophy, Youtube } from "lucide-react";

type Phase = "video" | "quiz" | "correct" | "wrong" | "done";
type VideoMode = "main" | "congrats" | "explanation";

export default function InteractiveLessonPlayer({
  lessonId, videoUrl, introVideoUrl, onComplete,
}: {
  lessonId: string;
  videoUrl: string;
  introVideoUrl?: string;
  onComplete?: () => void;
}) {
  const [steps, setSteps] = useState<LessonInteractiveStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("video");
  const [videoMode, setVideoMode] = useState<VideoMode>("main");
  const [loading, setLoading] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showIntro, setShowIntro] = useState(!!introVideoUrl);
  const [attempted, setAttempted] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const [boardFen, setBoardFen] = useState(new Chess().fen());
  const chessRef = useRef(new Chess());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("lesson_interactive_steps")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });
    setSteps((data as LessonInteractiveStep[]) ?? []);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (phase === "quiz" && steps[currentStep]) {
      try {
        chessRef.current = new Chess(steps[currentStep].fen);
      } catch {
        chessRef.current = new Chess();
      }
      setBoardFen(chessRef.current.fen());
      setAttempted(false);
    }
  }, [phase, currentStep, steps]);

  function onDrop(sourceSquare: string, targetSquare: string): boolean {
    if (phase !== "quiz") return false;
    const chess = chessRef.current;
    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;
      setBoardFen(chess.fen());

      const step = steps[currentStep];
      if (move.san === step.correct_san) {
        setPhase("correct");
        if (!attempted) setCorrectCount((c) => c + 1);
      } else {
        setPhase("wrong");
        if (!attempted) setWrongCount((c) => c + 1);
        setAttempted(true);
      }
      return true;
    } catch {
      return false;
    }
  }

  function retryQuiz() {
    const step = steps[currentStep];
    if (step) {
      try {
        chessRef.current = new Chess(step.fen);
      } catch {
        chessRef.current = new Chess();
      }
      setBoardFen(chessRef.current.fen());
      setPhase("quiz");
    }
  }

  function goToNext() {
    if (currentStep + 1 >= steps.length) {
      setPhase("done");
      onComplete?.();
      return;
    }
    setCurrentStep((s) => s + 1);
    setVideoMode("main");
    setPhase("video");
    setVideoKey((k) => k + 1);
  }

  function continueAfterCorrect() {
    const step = steps[currentStep];
    if (step.congrats_video_url) {
      setVideoMode("congrats");
      setPhase("video");
      setVideoKey((k) => k + 1);
    } else {
      goToNext();
    }
  }

  function handleVideoEnded() {
    if (showIntro) {
      return;
    }
    if (videoMode === "congrats") {
      goToNext();
    } else if (videoMode === "explanation") {
      retryQuiz();
    } else {
      // Main video reached its end point — show quiz
      setPhase("quiz");
    }
  }

  function startLesson() {
    setShowIntro(false);
    setVideoKey((k) => k + 1);
  }

  const currentVideoUrl = (() => {
    if (showIntro && introVideoUrl) return introVideoUrl;
    if (videoMode === "congrats" && steps[currentStep]?.congrats_video_url) return steps[currentStep].congrats_video_url;
    if (videoMode === "explanation" && steps[currentStep]?.explanation_video_url) return steps[currentStep].explanation_video_url;
    return videoUrl;
  })();

  const currentStartSeconds = (() => {
    if (showIntro) return 0;
    if (videoMode === "congrats") return steps[currentStep]?.congrats_start_seconds ?? 0;
    if (videoMode === "explanation") return steps[currentStep]?.explanation_start_seconds ?? 0;
    return steps[currentStep]?.video_start_seconds ?? 0;
  })();

  const currentEndSeconds = (() => {
    if (showIntro) return 0;
    if (videoMode === "congrats") return steps[currentStep]?.congrats_end_seconds ?? 0;
    if (videoMode === "explanation") return steps[currentStep]?.explanation_end_seconds ?? 0;
    return steps[currentStep]?.video_end_seconds ?? steps[currentStep]?.pause_at_seconds ?? 0;
  })();

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  if (steps.length === 0) {
    return <p className="text-center text-surface-400 py-8">No interactive steps in this lesson yet.</p>;
  }

  if (phase === "done") {
    return (
      <div className="text-center py-8 space-y-4">
        <Trophy className="w-16 h-16 mx-auto text-warning-500" />
        <h3 className="text-xl font-bold text-surface-900">Lesson Complete!</h3>
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
            <p className="text-3xl font-bold text-surface-700">{steps.length}</p>
            <p className="text-sm text-surface-500">Total Steps</p>
          </div>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-700">Checkpoint {currentStep + 1} of {steps.length}</span>
        <div className="flex gap-3 text-sm">
          <span className="text-success-600 font-medium">{correctCount} correct</span>
          <span className="text-error-500 font-medium">{wrongCount} wrong</span>
        </div>
      </div>

      {/* Video phase: show the video player */}
      {phase === "video" ? (
        <div className="space-y-3">
          <div className="aspect-video w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-black">
            {currentVideoUrl ? (
              <YouTubeIframe
                key={videoKey}
                url={currentVideoUrl}
                startSeconds={currentStartSeconds}
                endSeconds={currentEndSeconds}
                onEnd={handleVideoEnded}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                <Youtube className="w-12 h-12" />
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-surface-500 mb-2">
              {showIntro ? "Intro video — click Start when ready" :
               videoMode === "congrats" ? "Correct! Watch this message, then continue." :
               videoMode === "explanation" ? "Watch this explanation, then try again." :
               currentEndSeconds > 0 ? `Video will pause at ${formatTime(currentEndSeconds)} for your quiz.` :
               "Video will play to the end, then quiz you."}
            </p>
            {showIntro ? (
              <button onClick={startLesson}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                Start Lesson
              </button>
            ) : videoMode === "congrats" ? (
              <button onClick={goToNext}
                className="bg-success-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-success-700 transition">
                Skip & Continue
              </button>
            ) : videoMode === "explanation" ? (
              <button onClick={retryQuiz}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                Skip to Quiz
              </button>
            ) : (
              <button onClick={() => setPhase("quiz")}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                Go to Quiz Now
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quiz prompt */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-center">
            <p className="font-medium text-primary-800">{step.prompt || "What's the best move?"}</p>
          </div>

          {/* Chess board — video is hidden during quiz */}
          <div className="w-[min(100vw-3rem,420px)] aspect-square mx-auto">
            <Chessboard
              position={boardFen}
              onPieceDrop={onDrop}
              customBoardStyle={{ borderRadius: "8px", overflow: "hidden" }}
              customDarkSquareStyle={{ backgroundColor: "#b58863" }}
              customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
            />
          </div>

          {phase === "quiz" && (
            <p className="text-center text-sm text-surface-500">Make your move on the board.</p>
          )}

          {phase === "correct" && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-success-700">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-semibold text-lg">Correct!</span>
              </div>
              <button onClick={continueAfterCorrect}
                className="bg-success-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-success-700 transition">
                {step.congrats_video_url ? "Watch & Continue" : currentStep + 1 >= steps.length ? "Finish" : "Continue"}
              </button>
            </div>
          )}

          {phase === "wrong" && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-error-700">
                <XCircle className="w-6 h-6" />
                <span className="font-semibold text-lg">Not quite!</span>
              </div>
              {step.explanation_video_url ? (
                <button onClick={() => { setVideoMode("explanation"); setPhase("video"); setVideoKey((k) => k + 1); }}
                  className="bg-error-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-error-700 transition">
                  Watch Explanation
                </button>
              ) : (
                <button onClick={retryQuiz}
                  className="inline-flex items-center gap-2 bg-error-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-error-700 transition">
                  <RotateCcw className="w-4 h-4" /> Retry
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
