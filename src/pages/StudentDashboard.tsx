import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Profile, Course, Lesson, LessonProgress, Chat } from "@/lib/types";
import Layout, { type Tab } from "@/components/Layout";
import ChatWindow from "@/components/ChatWindow";
import VideoPlayer from "@/components/VideoPlayer";
import ChessBoard from "@/components/ChessBoard";
import LessonFiles from "@/components/LessonFiles";
import PuzzleSolver from "@/components/PuzzleSolver";
import InteractiveLessonPlayer from "@/components/InteractiveLessonPlayer";
import { formatShortTime } from "@/lib/utils";
import {
  BookOpen, Loader2, ChevronRight, ArrowLeft, CheckCircle2, Circle,
  MessageSquare, Grid3x3, FileText, Paperclip, Puzzle, Youtube,
  Award, Calendar, Trophy, Video,
} from "lucide-react";

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  if (!profile) return null;

  return (
    <Layout activeTab={tab} onTabChange={setTab} role="student">
      {tab === "dashboard" && <StudentDashboardHome profile={profile} />}
      {tab === "courses" && <StudentCourses profile={profile} />}
      {tab === "messages" && <StudentMessages profile={profile} />}
      {tab === "assignments" && <StudentAssignments profile={profile} />}
      {tab === "games" && <StudentGames profile={profile} />}
      {tab === "calendar" && <StudentCalendar />}
      {tab === "tournaments" && <StudentTournaments profile={profile} />}
      {tab === "certificates" && <StudentCertificates profile={profile} />}
    </Layout>
  );
}

function StudentDashboardHome({ profile }: { profile: Profile }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: enrolls } = await supabase.from("enrollments").select("course_id").eq("student_id", profile.id);
    const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
    let courseList: Course[] = [];
    if (courseIds.length > 0) {
      const { data } = await supabase.from("courses").select("*").in("id", courseIds);
      courseList = (data as Course[]) ?? [];
    }
    setCourses(courseList);
    const { data: certs } = await supabase.from("certificates").select("*").eq("student_id", profile.id);
    setCertificates(certs ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Welcome back, {profile.name.split(" ")[0]}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-50 text-primary-700"><BookOpen className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">{courses.length}</p><p className="text-sm text-surface-500">My Courses</p></div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-success-50 text-success-700"><Award className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">{certificates.length}</p><p className="text-sm text-surface-500">Certificates</p></div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent-50 text-accent-700"><Trophy className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">1200</p><p className="text-sm text-surface-500">Academy Rating</p></div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-warning-50 text-warning-600"><FileText className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">0</p><p className="text-sm text-surface-500">Pending Tasks</p></div>
        </div>
      </div>
      <h2 className="text-lg font-bold text-surface-900 mb-3">My Courses</h2>
      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>You haven't been enrolled in any courses yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-surface-200 p-5">
              <h3 className="font-semibold text-surface-900 text-lg">{c.title}</h3>
              <p className="text-sm text-surface-500 mt-1 line-clamp-2">{c.description || "No description"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentAssignments({ profile }: { profile: Profile }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: enrolls } = await supabase.from("enrollments").select("course_id").eq("student_id", profile.id);
      const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
      if (courseIds.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from("assignments").select("*, course:courses(title)").in("course_id", courseIds).order("created_at", { ascending: false });
      setAssignments(data ?? []);
      setLoading(false);
    }
    load();
  }, [profile.id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">My Assignments</h1>
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No assignments yet.</p></div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <h3 className="font-semibold text-surface-900">{a.title}</h3>
              <p className="text-xs text-surface-500 mt-1">{a.course?.title} • Due: {a.deadline ? new Date(a.deadline).toLocaleDateString() : "No deadline"}</p>
              {a.instructions && <p className="text-sm text-surface-600 mt-2">{a.instructions}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentGames({ profile }: { profile: Profile }) {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pgn, setPgn] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("game_analysis").select("*").eq("student_id", profile.id).order("created_at", { ascending: false });
    setGames(data ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  async function upload() {
    if (!pgn.trim()) return;
    setUploading(true);
    await supabase.from("game_analysis").insert({ student_id: profile.id, pgn, opponent: "", result: "1-0", opening: "", move_count: 0 });
    setPgn("");
    setUploading(false);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Game Analysis</h1>
      <div className="bg-white rounded-xl border border-surface-200 p-5 mb-6">
        <h2 className="font-semibold text-surface-900 mb-3">Upload PGN</h2>
        <textarea value={pgn} onChange={(e) => setPgn(e.target.value)} rows={6} placeholder="Paste your PGN here..." className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none font-mono text-sm" />
        <button onClick={upload} disabled={uploading || !pgn.trim()} className="mt-3 flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-60">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />} Upload Game
        </button>
      </div>
      <h2 className="font-semibold text-surface-900 mb-3">My Games</h2>
      {games.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400"><Video className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No games uploaded yet.</p></div>
      ) : (
        <div className="space-y-3">
          {games.map((g: any) => (
            <div key={g.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-surface-900">vs {g.opponent || "Unknown"}</h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">{g.result}</span>
              </div>
              {g.coach_notes && <p className="text-sm text-surface-600 mt-2"><span className="font-medium">Coach Notes:</span> {g.coach_notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentCalendar() {
  return <div className="p-8 text-center text-surface-400"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Calendar — view upcoming classes, tournaments, and events.</p></div>;
}
function StudentTournaments({ profile: _profile }: { profile: Profile }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("tournaments").select("*").order("tournament_date", { ascending: false }).then(({ data }) => {
      setTournaments(data ?? []); setLoading(false);
    });
  }, []);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Tournaments</h1>
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400"><Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No tournaments yet.</p></div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t: any) => (
            <div key={t.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <div className="flex items-start justify-between">
                <div><h3 className="font-semibold text-surface-900">{t.title}</h3><p className="text-xs text-surface-500 mt-1">{t.tournament_date} • {t.location ?? "TBD"}</p></div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.status === "completed" ? "bg-surface-100 text-surface-600" : t.status === "ongoing" ? "bg-success-50 text-success-700" : "bg-primary-50 text-primary-700"}`}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function StudentCertificates({ profile }: { profile: Profile }) {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("certificates").select("*").eq("student_id", profile.id).order("created_at", { ascending: false }).then(({ data }) => {
      setCerts(data ?? []); setLoading(false);
    });
  }, [profile.id]);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">My Certificates</h1>
      {certs.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400"><Award className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No certificates earned yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certs.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl border border-surface-200 p-5">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent-50 text-accent-700 mb-3"><Award className="w-6 h-6" /></div>
              <h3 className="font-semibold text-surface-900">{c.title}</h3>
              <p className="text-xs text-surface-500 mt-1">Issued: {c.issue_date}</p>
              <p className="text-xs text-surface-400 mt-1 font-mono">Code: {c.verification_code}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STUDENT COURSES
// ============================================================
function StudentCourses({ profile }: { profile: Profile }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Course | null>(null);

  const load = useCallback(async () => {
    const { data: enrolls } = await supabase.from("enrollments").select("course_id").eq("student_id", profile.id);
    const courseIds = (enrolls ?? []).map((e: { course_id: string }) => e.course_id);
    if (courseIds.length === 0) { setCourses([]); setLoading(false); return; }
    const { data } = await supabase.from("courses").select("*").in("id", courseIds).order("created_at", { ascending: false });
    setCourses((data as Course[]) ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (viewing) return <StudentCourseView course={viewing} studentId={profile.id} onBack={() => setViewing(null)} />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-1">My Courses</h1>
      <p className="text-surface-500 text-sm mb-6">Courses assigned to you by your academy</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>You haven't been enrolled in any courses yet. Ask your coach to assign one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((c) => (
            <button key={c.id} onClick={() => setViewing(c)}
              className="bg-white rounded-xl border border-surface-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition group">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-surface-300 group-hover:text-primary-500 transition" />
              </div>
              <h3 className="font-semibold text-surface-900 text-lg">{c.title}</h3>
              <p className="text-sm text-surface-500 mt-1 line-clamp-2">{c.description || "No description"}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentCourseView({ course, studentId, onBack }: { course: Course; studentId: string; onBack: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);

  const load = useCallback(async () => {
    const [l, p] = await Promise.all([
      supabase.from("lessons").select("*").eq("course_id", course.id).order("order_index", { ascending: true }),
      supabase.from("lesson_progress").select("lesson_id").eq("student_id", studentId).eq("completed", true),
    ]);
    setLessons((l.data as Lesson[]) ?? []);
    setProgress(new Set((p.data ?? []).map((r: { lesson_id: string }) => r.lesson_id)));
    setLoading(false);
  }, [course.id, studentId]);

  useEffect(() => { load(); }, [load]);

  if (viewingLesson) {
    return <LessonView lesson={viewingLesson} studentId={studentId} completed={progress.has(viewingLesson.id)}
      onBack={() => setViewingLesson(null)} onToggleComplete={async () => {
        if (progress.has(viewingLesson.id)) {
          await supabase.from("lesson_progress").delete().eq("student_id", studentId).eq("lesson_id", viewingLesson.id);
          setProgress((prev) => { const n = new Set(prev); n.delete(viewingLesson.id); return n; });
        } else {
          await supabase.from("lesson_progress").upsert({ student_id: studentId, lesson_id: viewingLesson.id, completed: true }, { onConflict: "student_id,lesson_id" });
          setProgress((prev) => new Set(prev).add(viewingLesson.id));
        }
      }} />;
  }

  const completedCount = progress.size;
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <button onClick={onBack} className="text-primary-600 text-sm mb-4 flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to my courses
      </button>
      <h1 className="text-2xl font-bold text-surface-900">{course.title}</h1>
      <p className="text-surface-500 mt-1 mb-4">{course.description}</p>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-surface-700">Your Progress</span>
          <span className="text-sm text-surface-500">{completedCount}/{lessons.length} lessons ({pct}%)</span>
        </div>
        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
          <div className="h-full bg-success-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : lessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No lessons in this course yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((l, idx) => {
            const done = progress.has(l.id);
            return (
              <button key={l.id} onClick={() => setViewingLesson(l)}
                className="w-full bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3 hover:border-primary-300 hover:shadow-sm transition text-left">
                {done ? <CheckCircle2 className="w-6 h-6 text-success-500 flex-shrink-0" /> : <Circle className="w-6 h-6 text-surface-300 flex-shrink-0" />}
                <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-surface-900 truncate">{l.title}</h3>
                  <p className="text-xs text-surface-500 truncate">
                    {l.lesson_type === "puzzles" ? "Puzzle set" : l.lesson_type === "interactive" ? "Interactive video lesson" : l.video_url ? "Video lesson" : "Text lesson"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-surface-300" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LessonView({ lesson, studentId, completed, onBack, onToggleComplete }: {
  lesson: Lesson; studentId: string; completed: boolean; onBack: () => void; onToggleComplete: () => void;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-primary-600 text-sm mb-4 flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to lessons
      </button>

      <h1 className="text-2xl font-bold text-surface-900 mb-4">{lesson.title}</h1>

      {lesson.lesson_type === "normal" && (
        <>
          {/* Video */}
          <div className="mb-6">
            <VideoPlayer url={lesson.video_url} title={lesson.title} />
          </div>

          {/* Content */}
          {lesson.content && (
            <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
              <h2 className="font-semibold text-surface-900 mb-3">Lesson Notes</h2>
              <div className="prose prose-surface max-w-none">
                <p className="whitespace-pre-wrap text-surface-700 leading-relaxed">{lesson.content}</p>
              </div>
            </div>
          )}

          {/* Interactive chess board */}
          <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
            <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Grid3x3 className="w-5 h-5 text-primary-600" /> Interactive Study Board
            </h2>
            <ChessBoard lessonId={lesson.id} startFen={lesson.fen} editable={false} />
          </div>

          {/* Images & PDFs */}
          <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
            <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-primary-600" /> Lesson Materials
            </h2>
            <LessonFiles lessonId={lesson.id} editable={false} />
          </div>
        </>
      )}

      {lesson.lesson_type === "puzzles" && (
        <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
          <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-primary-600" /> Puzzle Set
          </h2>
          <PuzzleSolver lessonId={lesson.id} onComplete={onToggleComplete} />
        </div>
      )}

      {lesson.lesson_type === "interactive" && (
        <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
          <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <Youtube className="w-5 h-5 text-error-500" /> Interactive Video Lesson
          </h2>
          <InteractiveLessonPlayer
            lessonId={lesson.id}
            videoUrl={lesson.video_url}
            introVideoUrl={lesson.intro_video_url}
            onComplete={onToggleComplete}
          />
        </div>
      )}

      {/* Complete button */}
      <button onClick={onToggleComplete}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition ${
          completed ? "bg-success-50 text-success-700 hover:bg-success-100" : "bg-primary-600 text-white hover:bg-primary-700"
        }`}>
        {completed ? <><CheckCircle2 className="w-5 h-5" /> Completed — Mark as not done</> : <><Circle className="w-5 h-5" /> Mark as Completed</>}
      </button>
    </div>
  );
}

// ============================================================
// STUDENT MESSAGES
// ============================================================
function StudentMessages({ profile }: { profile: Profile }) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [coach, setCoach] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("chats").select("*").eq("student_id", profile.id).maybeSingle();
    const c = data as Chat | null;
    setChat(c);
    if (c) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", c.coach_id).maybeSingle();
      setCoach(prof as Profile | null);
    }
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  if (!chat || !coach) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No coach has been assigned to you yet. Please contact your academy administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="flex-1 flex flex-col">
        <ChatWindow chatId={chat.id} myId={profile.id} otherPerson={coach} />
      </div>
    </div>
  );
}
