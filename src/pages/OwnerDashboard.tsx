import { useState, useEffect, useCallback } from "react";
import { supabase, EDGE_FUNCTION_URL, MANAGE_USER_URL } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type {
  Profile, Course, ClassSession, ActivityLogEntry, Tournament,
  Payment, Announcement, CalendarEvent, Certificate, AuditLogEntry,
  Resource, Assignment,
} from "@/lib/types";
import Layout, { type Tab } from "@/components/Layout";
import {
  Modal, Field, Button, StatCard, Spinner, EmptyState, Badge, ProgressBar,
} from "@/components/ui";
import {
  Users, BookOpen, UserPlus, Loader2, AlertCircle, Mail, Trash2,
  GraduationCap, ChevronRight, X, CheckSquare, Square, Key, RefreshCw,
  Calendar as CalIcon, Trophy, CreditCard, Megaphone, Library as LibIcon,
  BarChart3, Award, ScrollText, ClipboardList, Video, Plus, DollarSign,
  Pin, Search, Upload, Download, Clock, MapPin, FileText, TrendingUp,
} from "lucide-react";

export default function OwnerDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  if (!profile) return null;

  return (
    <Layout activeTab={tab} onTabChange={setTab} role="owner">
      {tab === "dashboard" && <DashboardTab profile={profile} />}
      {tab === "manage" && <ManageTab onChanged={() => {}} />}
      {tab === "courses" && <CoursesTab />}
      {tab === "attendance" && <AttendanceOverviewTab />}
      {tab === "calendar" && <CalendarTab />}
      {tab === "tournaments" && <TournamentsTab profile={profile} />}
      {tab === "finance" && <FinanceTab />}
      {tab === "announcements" && <AnnouncementsTab profile={profile} />}
      {tab === "library" && <LibraryTab profile={profile} />}
      {tab === "reports" && <ReportsTab />}
      {tab === "certificates" && <CertificatesTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "messages" && <p className="p-8 text-surface-500">Messages are available in the coach and student dashboards.</p>}
    </Layout>
  );
}

// ============================================================
// DASHBOARD TAB
// ============================================================
function DashboardTab({ profile }: { profile: Profile }) {
  const [stats, setStats] = useState({ coaches: 0, students: 0, courses: 0, todayClasses: 0 });
  const [todaySessions, setTodaySessions] = useState<(ClassSession & { course: Course; coach: Profile })[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickModal, setQuickModal] = useState<"student" | "class" | "tournament" | "coach" | "course" | null>(null);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [coaches, students, courses, sessions, acts] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("classes").select("*, course:courses(*), coach:profiles!classes_coach_id_fkey(*)").eq("scheduled_date", today).eq("status", "scheduled").order("start_time"),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setStats({
      coaches: coaches.count ?? 0,
      students: students.count ?? 0,
      courses: courses.count ?? 0,
      todayClasses: (sessions.data as unknown as (ClassSession & { course: Course; coach: Profile })[])?.length ?? 0,
    });
    setTodaySessions((sessions.data as unknown as (ClassSession & { course: Course; coach: Profile })[]) ?? []);
    setActivity((acts.data as ActivityLogEntry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={GraduationCap} label="Coaches" value={stats.coaches} color="primary" />
        <StatCard icon={Users} label="Students" value={stats.students} color="accent" />
        <StatCard icon={BookOpen} label="Courses" value={stats.courses} color="success" />
        <StatCard icon={CalIcon} label="Today's Classes" value={stats.todayClasses} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Today's Classes</h2>
          {todaySessions.length === 0 ? (
            <EmptyState icon={CalIcon} message="No classes scheduled today." />
          ) : (
            <div className="space-y-3">
              {todaySessions.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-surface-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-surface-900">{s.course?.title ?? s.title}</h3>
                      <p className="text-xs text-surface-500">Coach: {s.coach?.name ?? "—"}</p>
                    </div>
                    <Badge color="primary">{new Date(`2000-01-01T${s.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-500 mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} min</span>
                  </div>
                  <div className="flex gap-2">
                    {s.meeting_url && (
                      <a href={s.meeting_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-primary-600 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100">
                        <Video className="w-4 h-4" /> Join Meeting
                      </a>
                    )}
                    <Button variant="secondary" className="text-sm px-3 py-1.5">Mark Attendance</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Recent Activity</h2>
          {activity.length === 0 ? (
            <EmptyState icon={ScrollText} message="No recent activity." />
          ) : (
            <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100">
              {activity.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-900">{a.message}</p>
                    <p className="text-xs text-surface-400">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-surface-900 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setQuickModal("student")}><UserPlus className="w-4 h-4" /> Add Student</Button>
          <Button variant="secondary" onClick={() => setQuickModal("class")}><CalIcon className="w-4 h-4" /> Schedule Class</Button>
          <Button variant="secondary" onClick={() => setQuickModal("tournament")}><Trophy className="w-4 h-4" /> Create Tournament</Button>
          <Button variant="secondary" onClick={() => setQuickModal("coach")}><GraduationCap className="w-4 h-4" /> Add Coach</Button>
          <Button variant="secondary" onClick={() => setQuickModal("course")}><BookOpen className="w-4 h-4" /> Create Course</Button>
        </div>
      </div>

      {quickModal === "student" && <CreateUserModal role="student" coaches={[]} onClose={() => setQuickModal(null)} onCreated={() => { setQuickModal(null); load(); }} />}
      {quickModal === "coach" && <CreateUserModal role="coach" coaches={[]} onClose={() => setQuickModal(null)} onCreated={() => { setQuickModal(null); load(); }} />}
      {quickModal === "course" && <QuickCourseModal profileId={profile.id} onClose={() => setQuickModal(null)} onSaved={() => { setQuickModal(null); load(); }} />}
      {quickModal === "tournament" && <QuickTournamentModal profileId={profile.id} onClose={() => setQuickModal(null)} onSaved={() => { setQuickModal(null); load(); }} />}
      {quickModal === "class" && <QuickClassModal profileId={profile.id} onClose={() => setQuickModal(null)} onSaved={() => { setQuickModal(null); load(); }} />}
    </div>
  );
}

function QuickCourseModal({ profileId, onClose, onSaved }: { profileId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    await supabase.from("courses").insert({ title, description: desc, created_by: profileId });
    await supabase.from("activity_log").insert({ type: "course", message: `Course "${title}" created`, actor_id: profileId });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Create Course" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <Field label="Description"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>
        <Button onClick={save} disabled={busy || !title.trim()} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Create Course</Button>
      </div>
    </Modal>
  );
}

function QuickTournamentModal({ profileId, onClose, onSaved }: { profileId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", tournament_date: "", location: "", max_participants: 20, format: "swiss" as Tournament["format"], rounds: 5 });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.title.trim() || !form.tournament_date) return;
    setBusy(true);
    await supabase.from("tournaments").insert({ ...form, status: "upcoming", created_by: profileId });
    await supabase.from("activity_log").insert({ type: "tournament", message: `Tournament "${form.title}" created`, actor_id: profileId });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Create Tournament" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" value={form.tournament_date} onChange={(e) => setForm({ ...form, tournament_date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max Participants"><input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: +e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Format"><select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as Tournament["format"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="swiss">Swiss</option><option value="round-robin">Round Robin</option><option value="knockout">Knockout</option></select></Field>
        </div>
        <Button onClick={save} disabled={busy || !form.title.trim() || !form.tournament_date} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />} Create Tournament</Button>
      </div>
    </Modal>
  );
}

function QuickClassModal({ profileId, onClose, onSaved }: { profileId: string; onClose: () => void; onSaved: () => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [form, setForm] = useState({ course_id: "", coach_id: "", title: "", scheduled_date: "", start_time: "10:00", duration_minutes: 60, meeting_url: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      supabase.from("courses").select("*").order("title"),
      supabase.from("profiles").select("*").eq("role", "coach").order("name"),
    ]).then(([c, co]) => {
      setCourses((c.data as Course[]) ?? []);
      setCoaches((co.data as Profile[]) ?? []);
    });
  }, []);
  async function save() {
    if (!form.course_id || !form.coach_id || !form.scheduled_date) return;
    setBusy(true);
    await supabase.from("classes").insert({ ...form, status: "scheduled", notes: "" });
    await supabase.from("activity_log").insert({ type: "class", message: `Class scheduled for ${form.scheduled_date}`, actor_id: profileId });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Schedule Class" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Course"><select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="">Select course...</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
        <Field label="Coach"><select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="">Select coach...</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Title (optional)"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Start Time"><input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)"><input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Meeting URL"><input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://..." className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        </div>
        <Button onClick={save} disabled={busy || !form.course_id || !form.scheduled_date} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalIcon className="w-5 h-5" />} Schedule Class</Button>
      </div>
    </Modal>
  );
}

// ============================================================
// MANAGE TAB
// ============================================================
function ManageTab({ onChanged }: { onChanged: () => void }) {
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<"coach" | "student" | null>(null);

  const loadData = useCallback(async () => {
    const [p, s, c] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "coach").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
    ]);
    setCoaches((p.data as Profile[]) ?? []);
    setStudents((s.data as Profile[]) ?? []);
    setCourses((c.data as Course[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-1">Academy Management</h1>
      <p className="text-surface-500 text-sm mb-6">Create coach and student accounts</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={GraduationCap} label="Coaches" value={coaches.length} color="primary" />
        <StatCard icon={Users} label="Students" value={students.length} color="accent" />
        <StatCard icon={BookOpen} label="Courses" value={courses.length} color="success" />
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => setShowForm("coach")}><UserPlus className="w-5 h-5" /> Create Coach Account</Button>
        <Button variant="secondary" onClick={() => setShowForm("student")}><UserPlus className="w-5 h-5" /> Create Student Account</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="w-8 h-8" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CoachList coaches={coaches} />
          <StudentList students={students} coaches={coaches} onChanged={loadData} />
        </div>
      )}

      {showForm && <CreateUserModal role={showForm} coaches={coaches} onClose={() => setShowForm(null)} onCreated={loadData} />}
    </div>
  );
}

function CoachList({ coaches }: { coaches: Profile[] }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-200 flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-surface-500" />
        <h2 className="font-semibold text-surface-900">Coaches</h2>
        <span className="ml-auto text-sm text-surface-400">{coaches.length}</span>
      </div>
      {coaches.length === 0 ? (
        <p className="px-5 py-8 text-center text-surface-400 text-sm">No coaches yet.</p>
      ) : (
        <div className="divide-y divide-surface-100">
          {coaches.map((u) => (
            <div key={u.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">{u.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-surface-900 truncate">{u.name}</p>
                <p className="text-xs text-surface-500 truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentList({ students, coaches, onChanged }: { students: Profile[]; coaches: Profile[]; onChanged: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reassignCoach, setReassignCoach] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [busy, setBusy] = useState(false);
  const [coachMap, setCoachMap] = useState<Record<string, string>>({});
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetResult, setResetResult] = useState<{ user: string; password: string } | null>(null);

  useEffect(() => {
    if (students.length === 0) return;
    supabase.from("coach_students").select("student_id, coach_id").then(({ data }) => {
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { student_id: string; coach_id: string }) => { map[r.student_id] = r.coach_id; });
      setCoachMap(map);
    });
  }, [students]);

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`Delete ${name}? This permanently removes their account and all associated data.`)) return;
    setBusy(true);
    const token = await getToken();
    if (!token) return;
    const res = await fetch(MANAGE_USER_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "delete", userId }) });
    if (res.ok) { onChanged(); setExpanded(null); }
    setBusy(false);
  }

  async function handleReassign(studentId: string) {
    if (!selectedCoach) return;
    setBusy(true);
    const token = await getToken();
    if (!token) return;
    const res = await fetch(MANAGE_USER_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "reassign", userId: studentId, newCoachId: selectedCoach }) });
    if (res.ok) { setCoachMap({ ...coachMap, [studentId]: selectedCoach }); setReassignCoach(null); setSelectedCoach(""); }
    setBusy(false);
  }

  async function handleResetPassword(userId: string) {
    if (!newPassword || newPassword.length < 6) { alert("Password must be at least 6 characters."); return; }
    setBusy(true);
    const token = await getToken();
    if (!token) { setBusy(false); return; }
    const res = await fetch(MANAGE_USER_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "reset_password", userId, newPassword }) });
    const result = await res.json();
    if (res.ok) { setResetResult({ user: userId, password: newPassword }); setResetPasswordFor(null); setNewPassword(""); } else { alert(result.error ?? "Failed to reset password"); }
    setBusy(false);
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-200 flex items-center gap-2">
        <Users className="w-5 h-5 text-surface-500" />
        <h2 className="font-semibold text-surface-900">Students</h2>
        <span className="ml-auto text-sm text-surface-400">{students.length}</span>
      </div>
      {students.length === 0 ? (
        <p className="px-5 py-8 text-center text-surface-400 text-sm">No students yet.</p>
      ) : (
        <div className="divide-y divide-surface-100">
          {students.map((u) => {
            const assignedCoach = coaches.find((c) => c.id === coachMap[u.id]);
            const isExpanded = expanded === u.id;
            return (
              <div key={u.id}>
                <button onClick={() => setExpanded(isExpanded ? null : u.id)} className="w-full px-5 py-3 flex items-center gap-3 hover:bg-surface-50 transition text-left">
                  <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-semibold">{u.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-surface-900 truncate">{u.name}</p>
                    <p className="text-xs text-surface-500 truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                  </div>
                  {assignedCoach && <Badge color="primary" >Coach: {assignedCoach.name}</Badge>}
                  <ChevronRight className={`w-4 h-4 text-surface-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="px-5 pb-4 space-y-3 bg-surface-50/50">
                    <div className="bg-white rounded-lg border border-surface-200 p-3">
                      <p className="text-xs font-semibold text-surface-500 mb-2 flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Login Credentials</p>
                      <div className="text-sm space-y-1">
                        <p><span className="text-surface-500">Email:</span> <span className="font-mono text-surface-900">{u.email}</span></p>
                        <p><span className="text-surface-500">Assigned Coach:</span> <span className="font-medium text-surface-900">{assignedCoach?.name ?? "None"}</span></p>
                      </div>
                      {resetResult?.user === u.id && (
                        <div className="mt-2 bg-success-50 border border-success-200 rounded-lg p-2.5">
                          <p className="text-xs text-success-700 mb-1">Password has been reset. Share this new password:</p>
                          <p className="font-mono text-sm text-success-900 font-semibold">{resetResult.password}</p>
                        </div>
                      )}
                    </div>
                    {resetPasswordFor === u.id ? (
                      <div className="bg-white rounded-lg border border-surface-200 p-3 space-y-2">
                        <p className="text-xs font-semibold text-surface-500">Set New Password</p>
                        <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500" />
                        <div className="flex gap-2">
                          <Button onClick={() => handleResetPassword(u.id)} disabled={busy || newPassword.length < 6} className="text-sm px-3 py-1.5">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />} Reset Password</Button>
                          <Button variant="ghost" onClick={() => { setResetPasswordFor(null); setNewPassword(""); }} className="text-sm px-3 py-1.5">Cancel</Button>
                        </div>
                      </div>
                    ) : null}
                    {reassignCoach === u.id ? (
                      <div className="bg-white rounded-lg border border-surface-200 p-3 space-y-2">
                        <p className="text-xs font-semibold text-surface-500">Reassign to Coach</p>
                        <select value={selectedCoach} onChange={(e) => setSelectedCoach(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary-500">
                          <option value="">Select a coach...</option>
                          {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <Button onClick={() => handleReassign(u.id)} disabled={busy || !selectedCoach} className="text-sm px-3 py-1.5">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Confirm</Button>
                          <Button variant="ghost" onClick={() => { setReassignCoach(null); setSelectedCoach(""); }} className="text-sm px-3 py-1.5">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => { setReassignCoach(u.id); setSelectedCoach(coachMap[u.id] ?? ""); }} className="text-sm text-primary-600 px-3 py-1.5"><RefreshCw className="w-3.5 h-3.5" /> Change Coach</Button>
                        <Button variant="ghost" onClick={() => { setResetPasswordFor(u.id); setNewPassword(""); setResetResult(null); }} className="text-sm text-accent-600 px-3 py-1.5"><Key className="w-3.5 h-3.5" /> Reset Password</Button>
                        <Button variant="ghost" onClick={() => handleDelete(u.id, u.name)} disabled={busy} className="text-sm text-error-600 px-3 py-1.5">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Remove</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateUserModal({ role, coaches, onClose, onCreated }: { role: "coach" | "student"; coaches: Profile[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; name: string; role: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setError("Session expired. Please sign in again."); setBusy(false); return; }
    const res = await fetch(EDGE_FUNCTION_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, email: email.trim(), password, role, coachId: role === "student" ? coachId : undefined }) });
    const result = await res.json();
    if (!res.ok) { setError(result.error ?? "Failed to create account"); setBusy(false); return; }
    onCreated();
    setCreatedCreds({ email: email.trim(), password, name, role });
  }

  return (
    <Modal title={`Create ${role === "coach" ? "Coach" : "Student"} Account`} onClose={onClose}>
      {error && <div className="flex items-center gap-2 bg-error-50 text-error-700 text-sm rounded-lg px-4 py-3 mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
      {createdCreds ? (
        <div className="space-y-4">
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3"><CheckSquare className="w-5 h-5 text-success-600" /><h3 className="font-semibold text-success-800">Account Created Successfully</h3></div>
            <p className="text-sm text-success-700 mb-3">Share these credentials with the {createdCreds.role}:</p>
            <div className="bg-white rounded-lg border border-success-200 p-3 space-y-1.5 font-mono text-sm">
              <p><span className="text-surface-500">Name:</span> <span className="text-surface-900 font-semibold">{createdCreds.name}</span></p>
              <p><span className="text-surface-500">Email:</span> <span className="text-surface-900 font-semibold">{createdCreds.email}</span></p>
              <p><span className="text-surface-500">Password:</span> <span className="text-surface-900 font-semibold">{createdCreds.password}</span></p>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name"><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" /></Field>
          <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" /></Field>
          <Field label="Password"><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" /></Field>
          {role === "student" && (
            <Field label="Assign to Coach"><select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none">{coaches.length === 0 && <option value="">No coaches available</option>}{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          )}
          <Button type="submit" disabled={busy || (role === "student" && coaches.length === 0)} className="w-full">{busy && <Loader2 className="w-5 h-5 animate-spin" />}{busy ? "Creating..." : "Create Account"}</Button>
        </form>
      )}
    </Modal>
  );
}

// ============================================================
// COURSES TAB
// ============================================================
function CoursesTab() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollBusy, setEnrollBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student").order("name"),
    ]);
    setCourses((c.data as Course[]) ?? []);
    setStudents((s.data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedCourse) return;
    supabase.from("enrollments").select("student_id").eq("course_id", selectedCourse.id).then(({ data }) => setEnrolledIds(new Set((data ?? []).map((d: { student_id: string }) => d.student_id))));
  }, [selectedCourse]);

  async function toggleEnroll(studentId: string) {
    if (!selectedCourse || !profile) return;
    setEnrollBusy(true);
    if (enrolledIds.has(studentId)) {
      await supabase.from("enrollments").delete().eq("course_id", selectedCourse.id).eq("student_id", studentId);
      setEnrolledIds((prev) => { const n = new Set(prev); n.delete(studentId); return n; });
    } else {
      await supabase.from("enrollments").insert({ course_id: selectedCourse.id, student_id: studentId, assigned_by: profile.id });
      setEnrolledIds((prev) => new Set(prev).add(studentId));
    }
    setEnrollBusy(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Manage Enrollments</h1>
      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} message="No courses created yet. Coaches create courses from their dashboard." />
      ) : !selectedCourse ? (
        <div className="space-y-3">
          {courses.map((c) => (
            <button key={c.id} onClick={() => setSelectedCourse(c)} className="w-full bg-white rounded-xl border border-surface-200 p-5 flex items-center justify-between hover:border-primary-300 hover:shadow-sm transition text-left">
              <div><h3 className="font-semibold text-surface-900">{c.title}</h3><p className="text-sm text-surface-500 mt-1 line-clamp-1">{c.description || "No description"}</p></div>
              <ChevronRight className="w-5 h-5 text-surface-400" />
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedCourse(null)} className="text-primary-600 text-sm mb-4 flex items-center gap-1 hover:underline">← Back to courses</button>
          <h2 className="text-xl font-bold text-surface-900 mb-1">{selectedCourse.title}</h2>
          <p className="text-surface-500 text-sm mb-6">Select which students are enrolled in this course.</p>
          <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100">
            {students.length === 0 ? <p className="px-5 py-8 text-center text-surface-400 text-sm">No students created yet.</p> : students.map((s) => (
              <button key={s.id} onClick={() => toggleEnroll(s.id)} disabled={enrollBusy} className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-surface-50 transition text-left">
                {enrolledIds.has(s.id) ? <CheckSquare className="w-5 h-5 text-success-500" /> : <Square className="w-5 h-5 text-surface-300" />}
                <div className="flex-1 min-w-0"><p className="font-medium text-surface-900 truncate">{s.name}</p><p className="text-xs text-surface-500 truncate">{s.email}</p></div>
                <Badge color={enrolledIds.has(s.id) ? "success" : "surface"}>{enrolledIds.has(s.id) ? "Enrolled" : "Not enrolled"}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ATTENDANCE OVERVIEW TAB
// ============================================================
function AttendanceOverviewTab() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<(ClassSession & { course: Course; coach: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingClass, setMarkingClass] = useState<ClassSession | null>(null);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("classes").select("*, course:courses(*), coach:profiles!classes_coach_id_fkey(*)").eq("scheduled_date", today).order("start_time");
    setSessions((data as unknown as (ClassSession & { course: Course; coach: Profile })[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Today's Attendance</h1>
      {sessions.length === 0 ? (
        <EmptyState icon={ClipboardList} message="No classes scheduled today." />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-surface-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-surface-900">{s.course?.title ?? s.title}</h3>
                <p className="text-xs text-surface-500">Coach: {s.coach?.name ?? "—"} • {new Date(`2000-01-01T${s.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} • {s.duration_minutes} min</p>
              </div>
              <div className="flex items-center gap-2">
                {s.status === "completed" ? <Badge color="success">Completed</Badge> : <Button variant="secondary" onClick={() => setMarkingClass(s)} className="text-sm px-3 py-1.5"><ClipboardList className="w-4 h-4" /> Mark Attendance</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {markingClass && profile && <AttendanceModal classSession={markingClass} profileId={profile.id} onClose={() => setMarkingClass(null)} onDone={load} />}
    </div>
  );
}

function AttendanceModal({ classSession, profileId, onClose, onDone }: { classSession: ClassSession; profileId: string; onClose: () => void; onDone: () => void }) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [records, setRecords] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("enrollments").select("student:profiles!enrollments_student_id_fkey(*)").eq("course_id", classSession.course_id).then(({ data }) => {
      const studs = ((data as unknown as { student: Profile }[]) ?? []).map((d) => d.student).filter(Boolean);
      setStudents(studs);
      const init: Record<string, "present" | "absent" | "late" | "excused"> = {};
      studs.forEach((s) => { init[s.id] = "present"; });
      setRecords(init);
    });
  }, [classSession.course_id]);

  async function submit() {
    setBusy(true);
    const rows = Object.entries(records).map(([student_id, status]) => ({ class_id: classSession.id, student_id, status, remarks: "", marked_by: profileId }));
    if (rows.length > 0) {
      await supabase.from("attendance").upsert(rows, { onConflict: "class_id,student_id" });
    }
    await supabase.from("classes").update({ status: "completed" }).eq("id", classSession.id);
    await supabase.from("activity_log").insert({ type: "attendance", message: `Attendance marked for "${classSession.title || classSession.course_id}"`, actor_id: profileId });
    setBusy(false);
    onDone();
    onClose();
  }

  const statuses: ("present" | "absent" | "late" | "excused")[] = ["present", "absent", "late", "excused"];
  const statusColors: Record<string, "success" | "error" | "warning" | "surface"> = { present: "success", absent: "error", late: "warning", excused: "surface" };

  return (
    <Modal title={`Mark Attendance — ${classSession.title || "Class"}`} onClose={onClose} maxWidth="max-w-lg">
      {students.length === 0 ? (
        <EmptyState icon={Users} message="No students enrolled in this course." />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-surface-100 last:border-0">
                <p className="text-sm font-medium text-surface-900 truncate">{s.name}</p>
                <div className="flex gap-1">
                  {statuses.map((st) => (
                    <button key={st} onClick={() => setRecords({ ...records, [s.id]: st })}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full transition ${records[s.id] === st ? `bg-${statusColors[st]}-50 text-${statusColors[st]}-700 ring-2 ring-${statusColors[st]}-200` : "bg-surface-100 text-surface-500"}`}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button onClick={submit} disabled={busy} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />} Submit Attendance</Button>
        </div>
      )}
    </Modal>
  );
}

// ============================================================
// CALENDAR TAB
// ============================================================
function CalendarTab() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("calendar_events").select("*").order("event_date");
    setEvents((data as CalendarEvent[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const eventColors: Record<string, string> = { class: "bg-primary-500", tournament: "bg-error-500", holiday: "bg-success-500", exam: "bg-warning-500", workshop: "bg-accent-500" };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Calendar</h1>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-5 h-5" /> Add Event</Button>
      </div>
      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-surface-100">←</button>
          <h2 className="text-lg font-bold text-surface-900">{currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-surface-100">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-surface-500 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = events.filter((e) => e.event_date === dateStr);
            return (
              <div key={i} className={`min-h-16 rounded-lg border border-surface-100 p-1 ${dayEvents.length > 0 ? "bg-surface-50" : ""}`}>
                <p className="text-xs text-surface-600 font-medium">{day}</p>
                {dayEvents.map((e) => (
                  <button key={e.id} onClick={() => setSelectedEvent(e)} className={`w-full text-left text-xs text-white rounded px-1 py-0.5 mb-0.5 truncate ${eventColors[e.event_type] ?? "bg-surface-400"}`}>
                    {e.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {showAdd && <AddEventModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {selectedEvent && (
        <Modal title={selectedEvent.title} onClose={() => setSelectedEvent(null)}>
          <div className="space-y-2">
            <p className="text-sm text-surface-500"><CalIcon className="w-4 h-4 inline mr-1" />{new Date(selectedEvent.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <Badge color="primary">{selectedEvent.event_type}</Badge>
            {selectedEvent.description && <p className="text-sm text-surface-700">{selectedEvent.description}</p>}
          </div>
        </Modal>
      )}
      {loading && <div className="flex justify-center py-4"><Spinner /></div>}
    </div>
  );
}

function AddEventModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", event_date: "", event_type: "workshop" as CalendarEvent["event_type"] });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.title.trim() || !form.event_date) return;
    setBusy(true);
    await supabase.from("calendar_events").insert({ ...form, end_date: form.event_date, related_id: "" });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Add Calendar Event" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Type"><select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value as CalendarEvent["event_type"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="class">Class</option><option value="tournament">Tournament</option><option value="holiday">Holiday</option><option value="exam">Exam</option><option value="workshop">Workshop</option></select></Field>
        </div>
        <Button onClick={save} disabled={busy || !form.title.trim() || !form.event_date} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Add Event</Button>
      </div>
    </Modal>
  );
}

// ============================================================
// TOURNAMENTS TAB
// ============================================================
function TournamentsTab({ profile }: { profile: Profile }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Profile[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("tournaments").select("*").order("tournament_date", { ascending: false });
    setTournaments((data as Tournament[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    supabase.from("tournament_participants").select("student:profiles!tournament_participants_student_id_fkey(*)").eq("tournament_id", selected.id).then(({ data }) => {
      setParticipants(((data as unknown as { student: Profile }[]) ?? []).map((d) => d.student).filter(Boolean));
    });
  }, [selected]);

  const upcoming = tournaments.filter((t) => t.status === "upcoming" || t.status === "registration");
  const ongoing = tournaments.filter((t) => t.status === "ongoing");
  const completed = tournaments.filter((t) => t.status === "completed");

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Tournaments</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> Create Tournament</Button>
      </div>
      {tournaments.length === 0 ? (
        <EmptyState icon={Trophy} message="No tournaments yet." />
      ) : (
        <div className="space-y-6">
          {[["Upcoming", upcoming], ["Ongoing", ongoing], ["Completed", completed]].map(([label, list]) => (list as Tournament[]).length > 0 && (
            <div key={label as string}>
              <h2 className="text-lg font-bold text-surface-900 mb-3">{label as string}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(list as Tournament[]).map((t) => (
                  <button key={t.id} onClick={() => setSelected(t)} className="bg-white rounded-xl border border-surface-200 p-4 text-left hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-surface-900">{t.title}</h3>
                      <Badge color={t.status === "completed" ? "surface" : t.status === "ongoing" ? "warning" : "primary"}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-surface-500 mb-2">{new Date(t.tournament_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    {t.location && <p className="text-xs text-surface-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.location}</p>}
                    <p className="text-xs text-surface-400 mt-1">{t.format} • {t.rounds} rounds • Max {t.max_participants}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreate && <QuickTournamentModal profileId={profile.id} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} maxWidth="max-w-lg">
          <div className="space-y-3">
            <p className="text-sm text-surface-600">{selected.description || "No description"}</p>
            <div className="flex flex-wrap gap-2 text-xs text-surface-500">
              <Badge color="primary">{selected.format}</Badge>
              <Badge color="surface">{selected.rounds} rounds</Badge>
              <Badge color="surface">Max {selected.max_participants}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-surface-900 mb-2">Participants ({participants.length})</h4>
              {participants.length === 0 ? <p className="text-sm text-surface-400">No participants registered yet.</p> : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {participants.map((p) => <div key={p.id} className="text-sm text-surface-700 py-1">{p.name}</div>)}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// FINANCE TAB
// ============================================================
function FinanceTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student").order("name"),
    ]);
    setPayments((p.data as Payment[]) ?? []);
    setStudents((s.data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = payments.filter((p) => p.status === "pending" || p.status === "overdue");
  const paid = payments.filter((p) => p.status === "paid");
  const totalRevenue = paid.reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0);
  const studentMap = Object.fromEntries(students.map((s) => [s.id, s.name]));

  async function markPaid(id: string) {
    await supabase.from("payments").update({ status: "paid", paid_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Finance</h1>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-5 h-5" /> Add Payment Record</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} color="success" />
        <StatCard icon={TrendingUp} label="Pending Fees" value={`₹${pendingAmount.toLocaleString()}`} color="warning" />
        <StatCard icon={CreditCard} label="Total Transactions" value={payments.length} color="primary" />
      </div>
      <h2 className="text-lg font-bold text-surface-900 mb-3">Pending Fees</h2>
      {pending.length === 0 ? <EmptyState icon={CreditCard} message="No pending fees." /> : (
        <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100 mb-8">
          {pending.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between">
              <div><p className="font-medium text-surface-900">{studentMap[p.student_id] ?? "Unknown"}</p><p className="text-xs text-surface-500">{p.description || p.type} • Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</p></div>
              <div className="flex items-center gap-3"><Badge color={p.status === "overdue" ? "error" : "warning"}>₹{p.amount}</Badge><Button variant="secondary" onClick={() => markPaid(p.id)} className="text-sm px-3 py-1.5">Mark Paid</Button></div>
            </div>
          ))}
        </div>
      )}
      <h2 className="text-lg font-bold text-surface-900 mb-3">All Transactions</h2>
      {payments.length === 0 ? <EmptyState icon={CreditCard} message="No transactions yet." /> : (
        <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100">
          {payments.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between">
              <div><p className="font-medium text-surface-900">{studentMap[p.student_id] ?? "Unknown"}</p><p className="text-xs text-surface-500">{p.type} • {p.description || "—"}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm font-medium text-surface-900">₹{p.amount}</span><Badge color={p.status === "paid" ? "success" : p.status === "overdue" ? "error" : "warning"}>{p.status}</Badge></div>
            </div>
          ))}
        </div>
      )}
      {showAdd && <AddPaymentModal students={students} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddPaymentModal({ students, onClose, onSaved }: { students: Profile[]; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({ student_id: "", amount: 0, type: "tuition" as Payment["type"], description: "", due_date: "", status: "pending" as Payment["status"] });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.student_id || !form.amount) return;
    setBusy(true);
    await supabase.from("payments").insert({ ...form, created_by: profile?.id ?? "", invoice_number: `INV-${Date.now()}`, method: "", paid_date: "" });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Add Payment Record" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Student"><select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="">Select student...</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Payment["type"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="tuition">Tuition</option><option value="tournament_fee">Tournament Fee</option><option value="material">Material</option><option value="other">Other</option></select></Field>
        </div>
        <Field label="Description"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due Date"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Payment["status"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></Field>
        </div>
        <Button onClick={save} disabled={busy || !form.student_id || !form.amount} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Add Record</Button>
      </div>
    </Modal>
  );
}

// ============================================================
// ANNOUNCEMENTS TAB
// ============================================================
function AnnouncementsTab({ profile }: { profile: Profile }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements((data as Announcement[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Announcements</h1>
        <Button onClick={() => setShowCreate(true)}><Megaphone className="w-5 h-5" /> Create Announcement</Button>
      </div>
      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} message="No announcements yet." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {a.is_pinned && <Pin className="w-4 h-4 text-primary-500" />}
                  <h3 className="font-semibold text-surface-900">{a.title}</h3>
                </div>
                <Badge color="primary">{a.target_type}</Badge>
              </div>
              <p className="text-sm text-surface-600">{a.message}</p>
              <p className="text-xs text-surface-400 mt-2">{new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
      {showCreate && <CreateAnnouncementModal profileId={profile.id} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateAnnouncementModal({ profileId, onClose, onSaved }: { profileId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", message: "", target_type: "all" as Announcement["target_type"], target_id: "", is_pinned: false });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.title.trim() || !form.message.trim()) return;
    setBusy(true);
    await supabase.from("announcements").insert({ ...form, attachment_url: "", attachment_name: "", publish_date: new Date().toISOString(), expiry_date: "", created_by: profileId });
    await supabase.from("activity_log").insert({ type: "announcement", message: `Announcement "${form.title}" published`, actor_id: profileId });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Create Announcement" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <Field label="Message"><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>
        <Field label="Target Audience"><select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value as Announcement["target_type"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="all">All</option><option value="course">Course</option><option value="coach">Coaches</option><option value="student">Students</option></select></Field>
        <label className="flex items-center gap-2 text-sm text-surface-700"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} className="rounded" /> Pin this announcement</label>
        <Button onClick={save} disabled={busy || !form.title.trim() || !form.message.trim()} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />} Publish</Button>
      </div>
    </Modal>
  );
}

// ============================================================
// LIBRARY TAB
// ============================================================
function LibraryTab({ profile }: { profile: Profile }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    setResources((data as Resource[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = ["all", ...new Set(resources.map((r) => r.category).filter(Boolean))];
  const filtered = resources.filter((r) => (category === "all" || r.category === category) && (!search || r.title.toLowerCase().includes(search.toLowerCase())));

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Resource Library</h1>
        <Button onClick={() => setShowUpload(true)}><Upload className="w-5 h-5" /> Upload Resource</Button>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
          {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={LibIcon} message="No resources found." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-surface-900 line-clamp-1">{r.title}</h3>
                <Badge color="primary">{r.file_type}</Badge>
              </div>
              <p className="text-sm text-surface-500 line-clamp-2 mb-3">{r.description || "No description"}</p>
              {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary-600 flex items-center gap-1 hover:underline"><Download className="w-4 h-4" /> Download</a>}
            </div>
          ))}
        </div>
      )}
      {showUpload && <UploadResourceModal profileId={profile.id} onClose={() => setShowUpload(false)} onSaved={() => { setShowUpload(false); load(); }} />}
    </div>
  );
}

function UploadResourceModal({ profileId, onClose, onSaved }: { profileId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "", file_type: "other" as Resource["file_type"] });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.title.trim() || !file) return;
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "";
    const path = `resources/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("library").upload(path, file);
    if (upErr) { alert("Upload failed"); setBusy(false); return; }
    const { data: urlData } = supabase.storage.from("library").getPublicUrl(path);
    await supabase.from("resources").insert({ ...form, file_url: urlData.publicUrl, folder: form.category || "general", uploaded_by: profileId, download_count: 0 });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Upload Resource" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Beginners" className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="File Type"><select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value as Resource["file_type"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="video">Video</option><option value="book">Book</option><option value="pgn">PGN</option><option value="worksheet">Worksheet</option><option value="tournament_file">Tournament File</option><option value="other">Other</option></select></Field>
        </div>
        <Field label="File"><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700" /></Field>
        <Button onClick={save} disabled={busy || !form.title.trim() || !file} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} Upload</Button>
      </div>
    </Modal>
  );
}

// ============================================================
// REPORTS TAB
// ============================================================
function ReportsTab() {
  const [reportType, setReportType] = useState<"attendance" | "performance" | "revenue">("attendance");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    if (reportType === "attendance") {
      const { data } = await supabase.from("attendance").select("student:profiles!attendance_student_id_fkey(name), status, class:classes(title)").order("created_at", { ascending: false }).limit(100);
      setData((data as unknown as Record<string, unknown>[]) ?? []);
    } else if (reportType === "performance") {
      const { data } = await supabase.from("lesson_progress").select("student:profiles!lesson_progress_student_id_fkey(name), completed, lesson:lessons(title)").order("created_at", { ascending: false }).limit(100);
      setData((data as unknown as Record<string, unknown>[]) ?? []);
    } else {
      const { data } = await supabase.from("payments").select("student:profiles!payments_student_id_fkey(name), amount, status, type").order("created_at", { ascending: false }).limit(100);
      setData((data as unknown as Record<string, unknown>[]) ?? []);
    }
    setLoading(false);
  }

  function exportCSV() {
    if (data.length === 0) return;
    const flat = data.map((row) => {
      const out: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = typeof v === "object" && v !== null ? (v as { name?: string }).name ?? JSON.stringify(v) : (v as string | number | boolean) ?? "";
      }
      return out;
    });
    const headers = Object.keys(flat[0]);
    const csv = [headers.join(","), ...flat.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Reports</h1>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={reportType} onChange={(e) => setReportType(e.target.value as "attendance" | "performance" | "revenue")} className="px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
          <option value="attendance">Attendance Report</option>
          <option value="performance">Performance Report</option>
          <option value="revenue">Revenue Report</option>
        </select>
        <Button onClick={generate}><BarChart3 className="w-4 h-4" /> Generate</Button>
        {data.length > 0 && <Button variant="secondary" onClick={exportCSV}><Download className="w-4 h-4" /> Export CSV</Button>}
      </div>
      {loading ? <div className="flex justify-center py-12"><Spinner className="w-8 h-8" /></div> : data.length > 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>{Object.keys(data[0]).map((k) => <th key={k} className="px-4 py-2 text-left font-medium text-surface-600 capitalize">{k}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data.map((row, i) => (
                <tr key={i}>
                  {Object.entries(row).map(([k, v]) => <td key={k} className="px-4 py-2 text-surface-700">{typeof v === "object" && v !== null ? (v as { name?: string }).name ?? "—" : String(v ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon={BarChart3} message="Select a report type and click Generate." />}
    </div>
  );
}

// ============================================================
// CERTIFICATES TAB
// ============================================================
function CertificatesTab() {
  const [certificates, setCertificates] = useState<(Certificate & { student: Profile })[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const [c, s, co] = await Promise.all([
      supabase.from("certificates").select("*, student:profiles!certificates_student_id_fkey(*)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student").order("name"),
      supabase.from("courses").select("*").order("title"),
    ]);
    setCertificates((c.data as unknown as (Certificate & { student: Profile })[]) ?? []);
    setStudents((s.data as Profile[]) ?? []);
    setCourses((co.data as Course[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Certificates</h1>
        <Button onClick={() => setShowCreate(true)}><Award className="w-5 h-5" /> Generate Certificate</Button>
      </div>
      {certificates.length === 0 ? (
        <EmptyState icon={Award} message="No certificates issued yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certificates.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-surface-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-surface-900">{c.title}</h3>
                <Badge color="primary">{c.type.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-surface-500">Student: {c.student?.name ?? "—"}</p>
              <p className="text-xs text-surface-400 mt-1">Issued: {new Date(c.issue_date).toLocaleDateString()} • Code: {c.verification_code}</p>
            </div>
          ))}
        </div>
      )}
      {showCreate && <CreateCertificateModal students={students} courses={courses} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateCertificateModal({ students, courses, onClose, onSaved }: { students: Profile[]; courses: Course[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ student_id: "", type: "course_completion" as Certificate["type"], title: "", course_id: "", tournament_id: "" });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.student_id || !form.title.trim()) return;
    setBusy(true);
    const code = `ECA-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from("certificates").insert({ ...form, issue_date: new Date().toISOString().slice(0, 10), verification_code: code });
    setBusy(false);
    onSaved();
  }
  return (
    <Modal title="Generate Certificate" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Student"><select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="">Select student...</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Certificate Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Certificate["type"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="course_completion">Course Completion</option><option value="tournament_winner">Tournament Winner</option><option value="tournament_participation">Tournament Participation</option><option value="attendance">Attendance</option></select></Field>
        <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Beginner Chess Course Completion" className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        {form.type === "course_completion" && <Field label="Course"><select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="">Select course...</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>}
        <Button onClick={save} disabled={busy || !form.student_id || !form.title.trim()} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />} Generate</Button>
      </div>
    </Modal>
  );
}

// ============================================================
// AUDIT TAB
// ============================================================
function AuditTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actors, setActors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    const list = (data as AuditLogEntry[]) ?? [];
    setEntries(list);
    const ids = [...new Set(list.map((e) => e.actor_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      (profiles as Profile[] | null)?.forEach((p) => { map[p.id] = p.name; });
      setActors(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Audit Log</h1>
      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} message="No audit entries recorded." />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100">
          {entries.map((e) => (
            <div key={e.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-100 text-surface-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">{(actors[e.actor_id] ?? "?").charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-900"><span className="font-medium">{actors[e.actor_id] ?? "Unknown"}</span> — {e.action}</p>
                <p className="text-xs text-surface-400">{new Date(e.created_at).toLocaleString()} • {e.entity_type}{e.entity_id ? `: ${e.entity_id.slice(0, 8)}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
