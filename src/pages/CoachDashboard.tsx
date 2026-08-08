import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Profile, Course, Lesson, Chat, Message, LessonType } from "@/lib/types";
import Layout, { type Tab } from "@/components/Layout";
import { formatChatTime, formatShortTime } from "@/lib/utils";
import ChatWindow from "@/components/ChatWindow";
import VideoPlayer from "@/components/VideoPlayer";
import ChessBoard from "@/components/ChessBoard";
import LessonFiles from "@/components/LessonFiles";
import PuzzleEditor from "@/components/PuzzleEditor";
import InteractiveLessonEditor from "@/components/InteractiveLessonEditor";
import CoachCalendar from "@/components/CoachCalendar";
import { BookOpen, Plus, Loader2, X, Trash2, CreditCard as Edit3, ChevronRight, ArrowLeft, GripVertical, MessageSquare, Save, AlertCircle, Grid3x3, Paperclip, Puzzle, Youtube, Users, ClipboardList, Calendar, Trophy, FileText, Video } from "lucide-react";

export default function CoachDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  if (!profile) return null;

  return (
    <Layout activeTab={tab} onTabChange={setTab} role="coach">
      {tab === "dashboard" && <CoachDashboardHome profile={profile} />}
      {tab === "courses" && <CoachCourses profile={profile} />}
      {tab === "messages" && <CoachMessages profile={profile} />}
      {tab === "attendance" && <CoachAttendance profile={profile} />}
      {tab === "assignments" && <CoachAssignments profile={profile} />}
      {tab === "calendar" && <CoachCalendar profile={profile} />}
      {tab === "tournaments" && <CoachTournaments profile={profile} />}
      {tab === "students" && <CoachStudents profile={profile} />}
      {tab === "games" && <CoachGames profile={profile} />}
    </Layout>
  );
}

function CoachDashboardHome({ profile }: { profile: Profile }) {
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [pendingAttendance, setPendingAttendance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [classes, students, courses, attendance] = await Promise.all([
      supabase.from("classes").select("*, course:courses(*)").eq("coach_id", profile.id).eq("scheduled_date", today).order("start_time"),
      supabase.from("coach_students").select("id", { count: "exact", head: true }).eq("coach_id", profile.id),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("created_by", profile.id),
      supabase.from("classes").select("id").eq("coach_id", profile.id).eq("status", "scheduled"),
    ]);
    setTodayClasses(classes.data ?? []);
    setStudentCount(students.count ?? 0);
    setCourseCount(courses.count ?? 0);
    setPendingAttendance(attendance.data?.length ?? 0);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Coach Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-50 text-primary-700"><BookOpen className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">{todayClasses.length}</p><p className="text-sm text-surface-500">Today's Classes</p></div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent-50 text-accent-700"><Users className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">{studentCount}</p><p className="text-sm text-surface-500">Assigned Students</p></div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-success-50 text-success-700"><BookOpen className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">{courseCount}</p><p className="text-sm text-surface-500">My Courses</p></div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-warning-50 text-warning-600"><ClipboardList className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-surface-900">{pendingAttendance}</p><p className="text-sm text-surface-500">Attendance Pending</p></div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-surface-900 mb-3">Today's Classes</h2>
      {todayClasses.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No classes scheduled today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayClasses.map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-surface-900">{s.course?.title ?? s.title}</h3>
                  <p className="text-xs text-surface-500 mt-1">{s.start_time?.slice(0, 5)} • {s.duration_minutes} min</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.status === "completed" ? "bg-success-50 text-success-700" : "bg-primary-50 text-primary-700"}`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CoachAttendance({ profile }: { profile: Profile }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingClass, setMarkingClass] = useState<any | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("classes").select("*, course:courses(*)").eq("coach_id", profile.id).order("scheduled_date", { ascending: false }).limit(20);
    setClasses(data ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Attendance</h1>
      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No classes scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl border border-surface-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-surface-900">{s.course?.title ?? s.title}</h3>
                <p className="text-xs text-surface-500">{s.scheduled_date} • {s.start_time?.slice(0, 5)}</p>
              </div>
              {s.status === "completed" ? (
                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-success-50 text-success-700">Completed</span>
              ) : (
                <button onClick={() => setMarkingClass(s)} className="flex items-center gap-1.5 text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                  <ClipboardList className="w-4 h-4" /> Mark Attendance
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {markingClass && <AttendanceModal classSession={markingClass} coachId={profile.id} onClose={() => setMarkingClass(null)} onDone={() => { setMarkingClass(null); load(); }} />}
    </div>
  );
}

function AttendanceModal({ classSession, coachId, onClose, onDone }: { classSession: any; coachId: string; onClose: () => void; onDone: () => void }) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudents() {
      const { data: enrollments } = await supabase.from("enrollments").select("student_id").eq("course_id", classSession.course_id);
      const studentIds = (enrollments ?? []).map((e: any) => e.student_id);
      if (studentIds.length === 0) { setLoading(false); return; }
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", studentIds).order("name");
      setStudents(profiles ?? []);
      setLoading(false);
    }
    loadStudents();
  }, [classSession.course_id]);

  async function submit() {
    setBusy(true);
    const records = students.map((s) => ({
      class_id: classSession.id,
      student_id: s.id,
      status: statuses[s.id] ?? "absent",
      remarks: remarks[s.id] ?? "",
      marked_by: coachId,
    }));
    await supabase.from("attendance").upsert(records, { onConflict: "class_id,student_id" });
    await supabase.from("classes").update({ status: "completed" }).eq("id", classSession.id);
    await supabase.from("activity_log").insert({ type: "attendance_submitted", message: `Attendance submitted for ${classSession.course?.title ?? classSession.title}`, actor_id: coachId });
    setBusy(false);
    onDone();
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" /></div>;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 my-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-900">Mark Attendance</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-surface-500 mb-4">{classSession.course?.title ?? classSession.title} — {classSession.scheduled_date}</p>
        {students.length === 0 ? (
          <p className="text-center text-surface-400 py-8">No students enrolled in this course.</p>
        ) : (
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {students.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200">
                <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">{s.name.charAt(0).toUpperCase()}</div>
                <span className="font-medium text-surface-900 flex-1">{s.name}</span>
                <div className="flex gap-1">
                  {(["present", "absent", "late", "excused"] as const).map((st) => (
                    <button key={st} onClick={() => setStatuses({ ...statuses, [s.id]: st })}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${
                        (statuses[s.id] ?? "absent") === st
                          ? st === "present" ? "bg-success-500 text-white" : st === "absent" ? "bg-error-500 text-white" : st === "late" ? "bg-warning-500 text-white" : "bg-surface-500 text-white"
                          : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                      }`}>{st.charAt(0).toUpperCase()}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {students.length > 0 && (
          <button onClick={submit} disabled={busy} className="w-full bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />} Submit Attendance
          </button>
        )}
      </div>
    </div>
  );
}

function CoachAssignments({ profile }: { profile: Profile }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data: coursesData } = await supabase.from("courses").select("*").eq("created_by", profile.id);
    const courseList = coursesData ?? [];
    setCourses(courseList as Course[]);
    if (courseList.length > 0) {
      const { data } = await supabase.from("assignments").select("*, course:courses(title)").in("course_id", courseList.map((c: any) => c.id)).order("created_at", { ascending: false });
      setAssignments(data ?? []);
    }
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Assignments</h1>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition"><Plus className="w-5 h-5" /> New Assignment</button>
      </div>
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No assignments created yet.</p></div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <h3 className="font-semibold text-surface-900">{a.title}</h3>
              <p className="text-xs text-surface-500 mt-1">{a.course?.title} • Due: {a.deadline ? new Date(a.deadline).toLocaleDateString() : "No deadline"}</p>
              {a.instructions && <p className="text-sm text-surface-600 mt-2 line-clamp-2">{a.instructions}</p>}
            </div>
          ))}
        </div>
      )}
      {creating && <CreateAssignmentModal courses={courses} coachId={profile.id} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function CreateAssignmentModal({ courses, coachId, onClose, onSaved }: { courses: Course[]; coachId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ course_id: "", title: "", instructions: "", deadline: "", max_marks: 100 });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.course_id || !form.title.trim()) return;
    setBusy(true);
    await supabase.from("assignments").insert({
      course_id: form.course_id, coach_id: coachId, title: form.title,
      instructions: form.instructions, deadline: form.deadline || null,
      max_marks: form.max_marks, attachment_url: "", attachment_name: "",
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-900">New Assignment</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Course</label>
            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              <option value="">Select course...</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Instructions</label>
            <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Deadline</label>
              <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></div>
            <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Max Marks</label>
              <input type="number" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: +e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></div>
          </div>
          <button onClick={save} disabled={busy || !form.course_id || !form.title.trim()} className="w-full bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Create Assignment
          </button>
        </div>
      </div>
    </div>
  );
}

// CoachCalendar is now imported from @/components/CoachCalendar
function CoachTournaments({ profile: _profile }: { profile: Profile }) {
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
function CoachStudents({ profile }: { profile: Profile }) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const { data: links } = await supabase.from("coach_students").select("student_id").eq("coach_id", profile.id);
      const ids = (links ?? []).map((l: any) => l.student_id);
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("*").in("id", ids).order("name");
      setStudents(data ?? []);
      setLoading(false);
    }
    load();
  }, [profile.id]);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">My Students</h1>
      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400"><Users className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No students assigned yet.</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100">
          {students.map((s) => (
            <div key={s.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-semibold">{s.name.charAt(0).toUpperCase()}</div>
              <div><p className="font-medium text-surface-900">{s.name}</p><p className="text-xs text-surface-500">{s.email}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function CoachGames({ profile: _profile }: { profile: Profile }) {
  return <div className="p-8 text-center text-surface-400"><Video className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Game analysis — review student PGN uploads here.</p></div>;
}

// ============================================================
// COACH COURSES
// ============================================================
function CoachCourses({ profile }: { profile: Profile }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Course | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Course | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("courses").select("*").eq("created_by", profile.id).order("created_at", { ascending: false });
    setCourses((data as Course[]) ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (viewing) return <CourseLessons course={viewing} onBack={() => setViewing(null)} onChanged={load} />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">My Courses</h1>
          <p className="text-surface-500 text-sm mt-1">Create and manage your chess courses</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition shadow-sm">
          <Plus className="w-5 h-5" /> New Course
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No courses yet. Click "New Course" to create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-md transition">
              <button onClick={() => setViewing(c)} className="w-full text-left p-5">
                <h3 className="font-semibold text-surface-900 text-lg">{c.title}</h3>
                <p className="text-sm text-surface-500 mt-1 line-clamp-2">{c.description || "No description"}</p>
              </button>
              <div className="px-5 py-3 border-t border-surface-100 flex items-center gap-2">
                <button onClick={() => setEditing(c)} className="flex items-center gap-1.5 text-sm text-surface-600 hover:text-primary-600 px-3 py-1.5 rounded-lg hover:bg-surface-50 transition">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
                <button onClick={async () => {
                  if (confirm(`Delete "${c.title}"? This removes all lessons and enrollments.`)) {
                    await supabase.from("courses").delete().eq("id", c.id);
                    load();
                  }
                }} className="flex items-center gap-1.5 text-sm text-surface-600 hover:text-error-600 px-3 py-1.5 rounded-lg hover:bg-error-50 transition">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button onClick={() => setViewing(c)} className="ml-auto text-sm text-primary-600 hover:underline flex items-center gap-1">
                  Lessons <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CourseModal course={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={load} profileId={profile.id} />
      )}
    </div>
  );
}

function CourseModal({ course, onClose, onSaved, profileId }: { course: Course | null; onClose: () => void; onSaved: () => void; profileId: string }) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [desc, setDesc] = useState(course?.description ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    if (course) {
      await supabase.from("courses").update({ title, description: desc }).eq("id", course.id);
    } else {
      await supabase.from("courses").insert({ title, description: desc, created_by: profileId });
    }
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-900">{course ? "Edit Course" : "New Course"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Course Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none" />
          </div>
          <button onClick={save} disabled={busy || !title.trim()}
            className="w-full bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {course ? "Save Changes" : "Create Course"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COURSE LESSONS (CRUD + reorder)
// ============================================================
function CourseLessons({ course, onBack, onChanged }: { course: Course; onBack: () => void; onChanged: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("lessons").select("*").eq("course_id", course.id).order("order_index", { ascending: true });
    setLessons((data as Lesson[]) ?? []);
    setLoading(false);
  }, [course.id]);

  useEffect(() => { load(); }, [load]);

  async function moveLesson(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= lessons.length) return;
    const a = lessons[idx], b = lessons[target];
    await Promise.all([
      supabase.from("lessons").update({ order_index: b.order_index }).eq("id", a.id),
      supabase.from("lessons").update({ order_index: a.order_index }).eq("id", b.id),
    ]);
    load();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <button onClick={onBack} className="text-primary-600 text-sm mb-4 flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{course.title}</h1>
          <p className="text-surface-500 text-sm mt-1">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition shadow-sm">
          <Plus className="w-5 h-5" /> Add Lesson
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : lessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No lessons yet. Add your first lesson.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((l, idx) => (
            <div key={l.id} className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3">
              <div className="flex flex-col">
                <button onClick={() => moveLesson(idx, -1)} disabled={idx === 0} className="text-surface-300 hover:text-primary-600 disabled:opacity-30 text-xs">▲</button>
                <GripVertical className="w-4 h-4 text-surface-300" />
                <button onClick={() => moveLesson(idx, 1)} disabled={idx === lessons.length - 1} className="text-surface-300 hover:text-primary-600 disabled:opacity-30 text-xs">▼</button>
              </div>
              <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-surface-900 truncate">{l.title}</h3>
                <p className="text-xs text-surface-500 truncate">
                  {l.lesson_type === "puzzles" ? "Puzzle set" : l.lesson_type === "interactive" ? "Interactive video lesson" : l.video_url ? "Video lesson" : "Text lesson"}
                  {l.fen ? " • Has position" : ""}
                </p>
              </div>
              <button onClick={() => setEditing(l)} className="p-2 rounded-lg text-surface-500 hover:bg-surface-50 hover:text-primary-600 transition"><Edit3 className="w-4 h-4" /></button>
              <button onClick={async () => {
                if (confirm(`Delete lesson "${l.title}"?`)) {
                  await supabase.from("lessons").delete().eq("id", l.id);
                  load();
                }
              }} className="p-2 rounded-lg text-surface-500 hover:bg-error-50 hover:text-error-600 transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <LessonModal lesson={editing} courseId={course.id} orderIndex={lessons.length} onClose={() => { setCreating(false); setEditing(null); }} onSaved={load} />
      )}
    </div>
  );
}

function LessonModal({ lesson, courseId, orderIndex, onClose, onSaved }: { lesson: Lesson | null; courseId: string; orderIndex: number; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? "");
  const [fen, setFen] = useState(lesson?.fen ?? "");
  const [lessonType, setLessonType] = useState<LessonType>(lesson?.lesson_type ?? "normal");
  const [introVideoUrl, setIntroVideoUrl] = useState(lesson?.intro_video_url ?? "");
  const [busy, setBusy] = useState(false);
  const [savedLesson, setSavedLesson] = useState<Lesson | null>(lesson ?? null);

  async function save() {
    setBusy(true);
    if (savedLesson) {
      await supabase.from("lessons").update({ title, content, video_url: videoUrl, fen, lesson_type: lessonType, intro_video_url: introVideoUrl }).eq("id", savedLesson.id);
      onSaved();
    } else {
      const { data } = await supabase.from("lessons").insert({ course_id: courseId, title, content, video_url: videoUrl, fen, order_index: orderIndex, lesson_type: lessonType, intro_video_url: introVideoUrl }).select().single();
      if (data) setSavedLesson(data as Lesson);
    }
    setBusy(false);
  }

  const typeOptions: { value: LessonType; label: string; icon: typeof Grid3x3; desc: string }[] = [
    { value: "normal", label: "Normal Lesson", icon: Grid3x3, desc: "Video + study board with move tree" },
    { value: "puzzles", label: "Puzzle Set", icon: Puzzle, desc: "Students solve positions by finding the correct move" },
    { value: "interactive", label: "Interactive Video", icon: Youtube, desc: "YouTube video pauses for quiz questions" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 my-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-900">{savedLesson ? "Edit Lesson" : "New Lesson"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Lesson Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>

          {/* Lesson type selector */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Lesson Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = lessonType === opt.value;
                return (
                  <button key={opt.value} onClick={() => setLessonType(opt.value)}
                    className={`p-3 rounded-lg border-2 text-left transition ${active ? "border-primary-500 bg-primary-50" : "border-surface-200 hover:border-surface-300"}`}>
                    <Icon className={`w-5 h-5 mb-1.5 ${active ? "text-primary-600" : "text-surface-400"}`} />
                    <p className={`text-sm font-medium ${active ? "text-primary-900" : "text-surface-700"}`}>{opt.label}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {lessonType === "normal" && (
            <>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Content (explanation text)</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-y" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Video URL (YouTube link or direct video file URL)</label>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
              </div>
            </>
          )}

          {lessonType === "puzzles" && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <p className="text-sm text-primary-800">Add puzzle positions after saving. Each puzzle has a FEN position and the correct move in SAN notation. Students will solve them one by one.</p>
            </div>
          )}

          {lessonType === "interactive" && (
            <>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5 flex items-center gap-1.5"><Youtube className="w-4 h-4 text-error-500" /> Main Lesson Video URL (YouTube)</label>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5 flex items-center gap-1.5"><Youtube className="w-4 h-4 text-error-500" /> Intro / Congrats Video URL (optional)</label>
                <input value={introVideoUrl} onChange={(e) => setIntroVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
                <p className="text-xs text-surface-500 mt-1">Plays at the start of the lesson. You can also add per-checkpoint congrats videos below.</p>
              </div>
            </>
          )}

          {!savedLesson ? (
            <button onClick={save} disabled={busy || !title.trim()}
              className="w-full bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save & Continue Editing
            </button>
          ) : (
            <>
              {lessonType === "normal" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">Starting Position (FEN) — leave blank for standard start</label>
                    <input value={fen} onChange={(e) => setFen(e.target.value)} placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none font-mono text-sm" />
                  </div>

                  <div className="bg-surface-50 rounded-xl border border-surface-200 p-4">
                    <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-1.5">
                      <Grid3x3 className="w-4 h-4 text-primary-600" /> Interactive Study Board
                    </h3>
                    <p className="text-xs text-surface-500 mb-3">Make moves on the board to build your lesson. Click a move in the tree to navigate. Add notes to any position. Branch variations by navigating back and playing a different move.</p>
                    <ChessBoard lessonId={savedLesson.id} startFen={fen} editable={true} onChanged={onSaved} />
                  </div>
                </>
              )}

              {lessonType === "puzzles" && (
                <div className="bg-surface-50 rounded-xl border border-surface-200 p-4">
                  <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-1.5">
                    <Puzzle className="w-4 h-4 text-primary-600" /> Puzzle Editor
                  </h3>
                  <PuzzleEditor lessonId={savedLesson.id} />
                </div>
              )}

              {lessonType === "interactive" && (
                <div className="bg-surface-50 rounded-xl border border-surface-200 p-4">
                  <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-error-500" /> Interactive Checkpoints
                  </h3>
                  <InteractiveLessonEditor lessonId={savedLesson.id} mainVideoUrl={videoUrl} />
                </div>
              )}

              {/* File uploads — always available */}
              <div className="bg-surface-50 rounded-xl border border-surface-200 p-4">
                <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-primary-600" /> Images & PDFs
                </h3>
                <LessonFiles lessonId={savedLesson.id} editable={true} />
              </div>

              <button onClick={save} disabled={busy}
                className="w-full bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Lesson
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COACH MESSAGES
// ============================================================
function CoachMessages({ profile }: { profile: Profile }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [students, setStudents] = useState<Record<string, Profile>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [mobileChat, setMobileChat] = useState(false);

  const load = useCallback(async () => {
    const { data: cs } = await supabase.from("chats").select("*").eq("coach_id", profile.id);
    const chatList = (cs as Chat[]) ?? [];
    setChats(chatList);

    if (chatList.length > 0) {
      const studentIds = chatList.map((c) => c.student_id);
      const { data: studs } = await supabase.from("profiles").select("*").in("id", studentIds);
      const map: Record<string, Profile> = {};
      (studs as Profile[] | null)?.forEach((s) => { map[s.id] = s; });
      setStudents(map);

      const lm: Record<string, Message> = {};
      await Promise.all(chatList.map(async (c) => {
        const { data } = await supabase.from("messages").select("*").eq("chat_id", c.id).order("created_at", { ascending: false }).limit(1);
        if (data && data[0]) lm[c.id] = data[0] as Message;
      }));
      setLastMessages(lm);
    }
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  if (chats.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No student conversations yet. The academy owner assigns students to you.</p>
        </div>
      </div>
    );
  }

  const activeStudent = activeChat ? students[activeChat.student_id] : null;

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex">
      {/* Chat list */}
      <div className={`${mobileChat ? "hidden" : "block"} md:block w-full md:w-80 bg-white border-r border-surface-200 overflow-y-auto`}>
        <div className="px-5 py-4 border-b border-surface-200">
          <h2 className="font-semibold text-surface-900">Student Messages</h2>
        </div>
        <div className="divide-y divide-surface-100">
          {chats.map((c) => {
            const s = students[c.student_id];
            const lm = lastMessages[c.id];
            return (
              <button key={c.id} onClick={() => { setActiveChat(c); setMobileChat(true); }}
                className={`w-full px-5 py-4 flex items-center gap-3 hover:bg-surface-50 transition text-left ${activeChat?.id === c.id ? "bg-primary-50" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-semibold flex-shrink-0">
                  {s?.name.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-surface-900 truncate">{s?.name ?? "Unknown"}</p>
                  <p className="text-xs text-surface-500 truncate">{lm ? lm.content || (lm.file_type === "pdf" ? "📎 PDF" : lm.file_type === "image" ? "📷 Image" : "") : "No messages yet"}</p>
                </div>
                {lm && <span className="text-xs text-surface-400 flex-shrink-0">{formatShortTime(lm.created_at)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      <div className={`${mobileChat ? "flex" : "hidden"} md:flex flex-1 flex-col`}>
        {activeChat && activeStudent ? (
          <ChatWindow chatId={activeChat.id} myId={profile.id} otherPerson={activeStudent} onBack={() => setMobileChat(false)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-surface-400">
            <div className="text-center"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Select a student to start chatting</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
