import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Profile, Course, ClassSession } from "@/lib/types";
import { Modal, Field, Button, Spinner, EmptyState, Badge } from "@/components/ui";
import {
  toDateString, monthGrid, addDays, addWeeks, formatTime12, formatDateLong,
  WEEKDAYS, timeToMinutes,
} from "@/lib/calendarUtils";
import { Plus, Loader2, X, Calendar as CalIcon, Users, Repeat, Trash2, CreditCard as Edit3, ChevronLeft, ChevronRight, Video, Clock, CheckSquare, Square } from "lucide-react";

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Lichess", "Chess.com", "Discord", "Other"];
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-primary-500", completed: "bg-success-500",
  cancelled: "bg-surface-400", rescheduled: "bg-warning-500",
};

interface ClassWithRelations extends ClassSession {
  course?: { title: string };
  coach?: { name: string };
  class_students?: { student_id: string }[];
}

export default function AdminClassCalendar() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithRelations | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("classes")
      .select("*, course:courses(title), coach:profiles!classes_coach_id_fkey(name), class_students(student_id)")
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });
    setClasses((data as unknown as ClassWithRelations[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!profile) return null;
  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const cells = monthGrid(year, month);
  const classesByDate: Record<string, ClassWithRelations[]> = {};
  for (const c of classes) {
    (classesByDate[c.scheduled_date] ??= []).push(c);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Class Calendar</h1>
          <p className="text-sm text-surface-500 mt-1">Schedule classes, assign students, manage recurring sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowRecurring(true)}>
            <Repeat className="w-4 h-4" /> Recurring
          </Button>
          <Button onClick={() => setShowSchedule(true)}>
            <Plus className="w-5 h-5" /> Schedule Class
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-surface-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-surface-900">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-surface-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-surface-500 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-20" />;
            const ds = toDateString(date);
            const dayClasses = classesByDate[ds] ?? [];
            const isToday = ds === toDateString(new Date());
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(ds)}
                className={`min-h-20 rounded-lg border p-1 text-left transition hover:border-primary-300 ${
                  dayClasses.length > 0 ? "bg-surface-50 border-surface-200" : "border-surface-100"
                } ${isToday ? "ring-2 ring-primary-300" : ""}`}
              >
                <p className={`text-xs font-medium ${isToday ? "text-primary-700" : "text-surface-600"}`}>{date.getDate()}</p>
                {dayClasses.slice(0, 3).map((c) => (
                  <div key={c.id} className={`w-full text-left text-xs text-white rounded px-1 py-0.5 mb-0.5 truncate ${STATUS_COLORS[c.status] ?? "bg-surface-400"}`}>
                    {c.start_time?.slice(0, 5)} {c.course?.title ?? c.title}
                  </div>
                ))}
                {dayClasses.length > 3 && <p className="text-xs text-surface-400 px-1">+{dayClasses.length - 3} more</p>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-surface-500 mb-4">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 capitalize">
            <span className={`w-3 h-3 rounded ${color}`} /> {status}
          </span>
        ))}
      </div>

      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          classes={classesByDate[selectedDate] ?? []}
          onClose={() => setSelectedDate(null)}
          onEdit={(c) => { setSelectedDate(null); setSelectedClass(c); }}
          onChanged={load}
        />
      )}

      {showSchedule && (
        <ScheduleClassModal
          profileId={profile.id}
          defaultDate={selectedDate ?? toDateString(new Date())}
          onClose={() => setShowSchedule(false)}
          onSaved={() => { setShowSchedule(false); load(); }}
        />
      )}

      {showRecurring && (
        <RecurringClassModal
          profileId={profile.id}
          onClose={() => setShowRecurring(false)}
          onSaved={() => { setShowRecurring(false); load(); }}
        />
      )}

      {selectedClass && (
        <ClassDetailModal
          cls={selectedClass}
          onClose={() => setSelectedClass(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function DayDetailPanel({ date, classes, onClose, onEdit, onChanged }: {
  date: string;
  classes: ClassWithRelations[];
  onClose: () => void;
  onEdit: (c: ClassWithRelations) => void;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} class(es)? This removes them from all student calendars.`)) return;
    const ids = [...selected];
    await supabase.from("classes").delete().in("id", ids);
    onChanged();
    setSelected(new Set());
  }

  async function bulkReschedule(offsetDays: number) {
    if (selected.size === 0) return;
    const ids = [...selected];
    const { data: targetClasses } = await supabase.from("classes").select("*").in("id", ids);
    if (!targetClasses) return;
    for (const c of targetClasses as ClassSession[]) {
      const newDate = toDateString(addDays(new Date(c.scheduled_date), offsetDays));
      await supabase.from("classes").update({
        scheduled_date: newDate,
        status: "rescheduled",
        original_date: c.original_date ?? c.scheduled_date,
      }).eq("id", c.id);
      for (const cs of (c as ClassWithRelations).class_students ?? []) {
        await supabase.from("notifications").insert({
          user_id: cs.student_id, category: "class", title: "Class Rescheduled",
          message: `${c.title} has been moved to ${formatDateLong(newDate)} at ${formatTime12(c.start_time)}.`,
          link: "/calendar",
        });
      }
    }
    onChanged();
    setSelected(new Set());
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  return (
    <div className="bg-white rounded-xl border border-primary-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-surface-900">{formatDateLong(date)}</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
      </div>
      {classes.length === 0 ? (
        <p className="text-sm text-surface-400 py-4 text-center">No classes on this day.</p>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 p-3 bg-primary-50 rounded-lg">
              <span className="text-sm text-primary-800 font-medium flex items-center mr-2">
                {selected.size} selected:
              </span>
              <Button variant="secondary" onClick={() => bulkReschedule(1)} className="text-xs px-3 py-1.5">+1 Day</Button>
              <Button variant="secondary" onClick={() => bulkReschedule(7)} className="text-xs px-3 py-1.5">+1 Week</Button>
              <Button variant="danger" onClick={bulkDelete} className="text-xs px-3 py-1.5">
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {classes.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 hover:bg-surface-50">
                <button onClick={() => toggle(c.id)} className="flex-shrink-0">
                  {selected.has(c.id) ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5 text-surface-300" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 truncate">{c.course?.title ?? c.title}</p>
                  <p className="text-xs text-surface-500">
                    {formatTime12(c.start_time)}
                    {c.end_time ? ` – ${formatTime12(c.end_time)}` : ` (${c.duration_minutes} min)`}
                    {" • "} {c.coach?.name ?? "Unassigned"}
                    {" • "} {c.class_students?.length ?? 0} students
                    {" • "} <span className="capitalize">{c.platform}</span>
                  </p>
                </div>
                <Badge color={c.status === "completed" ? "success" : c.status === "cancelled" ? "surface" : c.status === "rescheduled" ? "warning" : "primary"}>{c.status}</Badge>
                <button onClick={() => onEdit(c)} className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-primary-600">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleClassModal({ profileId, defaultDate, onClose, onSaved }: {
  profileId: string;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Profile[]>([]);
  const [form, setForm] = useState({
    course_id: "", coach_id: "", title: "",
    scheduled_date: defaultDate, start_time: "16:00", end_time: "17:00",
    platform: "Google Meet", meeting_url: "", notes: "",
  });
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [assignAll, setAssignAll] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("courses").select("*").order("title"),
      supabase.from("profiles").select("*").eq("role", "coach").order("name"),
      supabase.from("profiles").select("*").eq("role", "student").order("name"),
    ]).then(([c, co, s]) => {
      setCourses((c.data as Course[]) ?? []);
      setCoaches((co.data as Profile[]) ?? []);
      setAllStudents((s.data as Profile[]) ?? []);
    });
  }, []);

  useEffect(() => {
    if (!form.course_id) return;
    supabase.from("enrollments").select("student:profiles!enrollments_student_id_fkey(*)").eq("course_id", form.course_id)
      .then(({ data }) => {
        const studs = ((data as unknown as { student: Profile }[]) ?? []).map((d) => d.student).filter(Boolean);
        setEnrolledStudents(studs);
        if (assignAll) setSelectedStudents(new Set(studs.map((s) => s.id)));
      });
  }, [form.course_id, assignAll]);

  function toggleStudent(id: string) {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedStudents(next);
  }

  async function save() {
    if (!form.course_id || !form.coach_id || !form.scheduled_date || !form.start_time) return;
    setBusy(true);
    const duration = form.end_time ? timeToMinutes(form.end_time) - timeToMinutes(form.start_time) : 60;
    const { data: cls } = await supabase.from("classes").insert({
      course_id: form.course_id, coach_id: form.coach_id, title: form.title,
      scheduled_date: form.scheduled_date, start_time: form.start_time, end_time: form.end_time || null,
      duration_minutes: Math.max(duration, 15), meeting_url: form.meeting_url,
      platform: form.platform, notes: form.notes, status: "scheduled",
    }).select().single();
    if (cls) {
      const studentIds = [...selectedStudents];
      if (studentIds.length > 0) {
        await supabase.from("class_students").insert(studentIds.map((sid) => ({ class_id: cls.id, student_id: sid })));
        for (const sid of studentIds) {
          await supabase.from("notifications").insert({
            user_id: sid, category: "class", title: "New Class Scheduled",
            message: `${form.title || "Class"} on ${formatDateLong(form.scheduled_date)} at ${formatTime12(form.start_time)}`,
            link: "/calendar",
          });
        }
      }
      await supabase.from("activity_log").insert({
        type: "class_scheduled", message: `Scheduled class for ${formatDateLong(form.scheduled_date)}`,
        actor_id: profileId,
      });
    }
    setBusy(false);
    onSaved();
  }

  const studentList = assignAll ? enrolledStudents : allStudents;

  return (
    <Modal title="Schedule Class" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Course">
            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              <option value="">Select course...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Coach">
            <select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              <option value="">Select coach...</option>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Class Title (optional — defaults to course name)">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Opening Repertoire Session 3"
            className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
        </Field>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Date">
            <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
          </Field>
          <Field label="Start Time">
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
          </Field>
          <Field label="End Time">
            <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
          </Field>
          <Field label="Platform">
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Meeting URL">
          <input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
            placeholder="https://meet.google.com/..."
            className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" />
        </Field>

        <div className="border border-surface-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-700 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Assign Students
            </span>
            <label className="flex items-center gap-2 text-xs text-surface-500">
              <input type="checkbox" checked={assignAll} onChange={(e) => setAssignAll(e.target.checked)}
                className="rounded border-surface-300" />
              Only enrolled students
            </label>
          </div>
          {studentList.length === 0 ? (
            <p className="text-xs text-surface-400 py-2">
              {assignAll ? "No students enrolled in this course." : "No students in academy."}
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {studentList.map((s) => (
                <button key={s.id} onClick={() => toggleStudent(s.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50 text-left">
                  {selectedStudents.has(s.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-surface-300" />}
                  <span className="text-sm text-surface-700">{s.name}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-surface-400 mt-2">{selectedStudents.size} student(s) selected</p>
        </div>

        <Button onClick={save} disabled={busy || !form.course_id || !form.coach_id} className="w-full">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Schedule Class
        </Button>
      </div>
    </Modal>
  );
}

function RecurringClassModal({ profileId, onClose, onSaved }: {
  profileId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [form, setForm] = useState({
    course_id: "", coach_id: "", title: "",
    day_of_week: 1, start_time: "16:00", end_time: "17:00",
    platform: "Google Meet", meeting_url: "",
    start_date: toDateString(new Date()), num_weeks: 12,
  });
  const [busy, setBusy] = useState(false);
  const [assignAll, setAssignAll] = useState(true);

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
    if (!form.course_id || !form.coach_id) return;
    setBusy(true);
    const { data: recur } = await supabase.from("recurring_classes").insert({
      course_id: form.course_id, coach_id: form.coach_id, title: form.title,
      day_of_week: form.day_of_week, start_time: form.start_time, end_time: form.end_time || null,
      platform: form.platform, meeting_url: form.meeting_url,
      start_date: form.start_date, num_weeks: form.num_weeks,
      created_by: profileId,
    }).select().single();
    if (recur) {
      const startDate = new Date(form.start_date);
      let firstDate = startDate;
      while (firstDate.getDay() !== form.day_of_week) {
        firstDate = addDays(firstDate, 1);
      }
      const duration = form.end_time ? timeToMinutes(form.end_time) - timeToMinutes(form.start_time) : 60;
      const classInserts: Record<string, unknown>[] = [];
      for (let w = 0; w < form.num_weeks; w++) {
        const d = addWeeks(firstDate, w);
        classInserts.push({
          course_id: form.course_id, coach_id: form.coach_id, title: form.title,
          scheduled_date: toDateString(d), start_time: form.start_time, end_time: form.end_time || null,
          duration_minutes: Math.max(duration, 15), meeting_url: form.meeting_url,
          platform: form.platform, status: "scheduled", recurring_id: recur.id,
        });
      }
      const { data: created } = await supabase.from("classes").insert(classInserts).select("id, course_id, title, scheduled_date, start_time");
      if (assignAll && created) {
        const { data: enrollments } = await supabase.from("enrollments").select("student_id").eq("course_id", form.course_id);
        const studentIds = (enrollments ?? []).map((e: Record<string, unknown>) => e.student_id as string);
        if (studentIds.length > 0) {
          const csInserts: { class_id: string; student_id: string }[] = [];
          for (const cls of created as Record<string, unknown>[]) {
            for (const sid of studentIds) {
              csInserts.push({ class_id: cls.id as string, student_id: sid });
            }
          }
          await supabase.from("class_students").insert(csInserts);
        }
      }
    }
    setBusy(false);
    onSaved();
  }

  return (
    <Modal title="Recurring Class Schedule" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-sm text-primary-800">
          <Repeat className="w-4 h-4 inline mr-1" />
          Automatically creates weekly class sessions for the selected number of weeks.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Course">
            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              <option value="">Select course...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Coach">
            <select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              <option value="">Select coach...</option>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Day of Week">
            <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: +e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Number of Weeks">
            <input type="number" min={1} max={52} value={form.num_weeks}
              onChange={(e) => setForm({ ...form, num_weeks: +e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Start Time">
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
          </Field>
          <Field label="End Time">
            <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
          </Field>
          <Field label="Platform">
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Meeting URL">
          <input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
            placeholder="https://meet.google.com/..."
            className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
        </Field>
        <Field label="Start Date (first occurrence begins on/after this date)">
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-surface-600">
          <input type="checkbox" checked={assignAll} onChange={(e) => setAssignAll(e.target.checked)}
            className="rounded border-surface-300" />
          Auto-assign all enrolled students to each session
        </label>
        <div className="bg-surface-50 rounded-lg p-3 text-sm text-surface-600">
          <Clock className="w-4 h-4 inline mr-1" />
          This will create <strong>{form.num_weeks}</strong> weekly class sessions
          on <strong>{WEEKDAYS[form.day_of_week]}</strong>s at <strong>{formatTime12(form.start_time)}</strong>.
        </div>
        <Button onClick={save} disabled={busy || !form.course_id || !form.coach_id} className="w-full">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Repeat className="w-5 h-5" />} Create {form.num_weeks} Sessions
        </Button>
      </div>
    </Modal>
  );
}

function ClassDetailModal({ cls, onClose, onChanged }: {
  cls: ClassWithRelations;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    scheduled_date: cls.scheduled_date, start_time: cls.start_time,
    end_time: cls.end_time ?? "", meeting_url: cls.meeting_url,
    platform: cls.platform, status: cls.status, notes: cls.notes,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cls.class_students && cls.class_students.length > 0) {
      supabase.from("profiles").select("*").in("id", cls.class_students.map((cs) => cs.student_id)).order("name")
        .then(({ data }) => setStudents((data as Profile[]) ?? []));
    }
    supabase.from("profiles").select("*").eq("role", "student").order("name")
      .then(({ data }) => setAllStudents((data as Profile[]) ?? []));
  }, [cls]);

  async function saveEdit() {
    setBusy(true);
    const dateChanged = form.scheduled_date !== cls.scheduled_date;
    await supabase.from("classes").update({
      scheduled_date: form.scheduled_date, start_time: form.start_time,
      end_time: form.end_time || null, meeting_url: form.meeting_url,
      platform: form.platform, status: form.status, notes: form.notes,
      original_date: dateChanged ? (cls.original_date ?? cls.scheduled_date) : cls.original_date,
    }).eq("id", cls.id);
    if (form.status !== cls.status || dateChanged) {
      for (const cs of cls.class_students ?? []) {
        const title = form.status === "cancelled" ? "Class Cancelled" : dateChanged ? "Class Rescheduled" : "Class Updated";
        const msg = form.status === "cancelled"
          ? `${cls.course?.title ?? cls.title} on ${formatDateLong(cls.scheduled_date)} has been cancelled.`
          : `${cls.course?.title ?? cls.title} is now on ${formatDateLong(form.scheduled_date)} at ${formatTime12(form.start_time)}.`;
        await supabase.from("notifications").insert({
          user_id: cs.student_id, category: "class", title, message: msg, link: "/calendar",
        });
      }
    }
    setBusy(false);
    setEditing(false);
    onChanged();
  }

  async function removeStudent(sid: string) {
    await supabase.from("class_students").delete().eq("class_id", cls.id).eq("student_id", sid);
    setStudents(students.filter((s) => s.id !== sid));
  }

  async function addStudent(sid: string) {
    await supabase.from("class_students").insert({ class_id: cls.id, student_id: sid });
    const { data } = await supabase.from("profiles").select("*").eq("id", sid).single();
    if (data) setStudents([...students, data as Profile]);
    await supabase.from("notifications").insert({
      user_id: sid, category: "class", title: "Added to Class",
      message: `You've been added to ${cls.course?.title ?? cls.title} on ${formatDateLong(cls.scheduled_date)}.`,
      link: "/calendar",
    });
  }

  const assignedIds = new Set(students.map((s) => s.id));
  const unassigned = allStudents.filter((s) => !assignedIds.has(s.id));

  return (
    <Modal title={cls.course?.title ?? cls.title} onClose={onClose} maxWidth="max-w-2xl">
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClassSession["status"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Start"><input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
            <Field label="End"><input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
            <Field label="Platform"><select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">{PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          </div>
          <Field label="Meeting URL"><input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>
          <div className="flex gap-2">
            <Button onClick={saveEdit} disabled={busy} className="flex-1">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />} Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : showAssign ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-900">Assign Students</h3>
            <Button variant="ghost" onClick={() => setShowAssign(false)} className="text-sm px-2 py-1">Done</Button>
          </div>
          {unassigned.length === 0 ? <p className="text-sm text-surface-400 py-4 text-center">All students assigned.</p> : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {unassigned.map((s) => (
                <button key={s.id} onClick={() => addStudent(s.id)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50 text-left">
                  <Plus className="w-4 h-4 text-primary-600" />
                  <span className="text-sm text-surface-700">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge color={cls.status === "completed" ? "success" : cls.status === "cancelled" ? "surface" : cls.status === "rescheduled" ? "warning" : "primary"}>{cls.status}</Badge>
            <Badge color="accent">{cls.platform}</Badge>
            {cls.original_date && <Badge color="warning">Moved from {cls.original_date}</Badge>}
          </div>
          <div className="text-sm text-surface-600 space-y-1">
            <p className="flex items-center gap-2"><CalIcon className="w-4 h-4 text-surface-400" /> {formatDateLong(cls.scheduled_date)}</p>
            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-surface-400" /> {formatTime12(cls.start_time)}{cls.end_time ? ` – ${formatTime12(cls.end_time)}` : ` (${cls.duration_minutes} min)`}</p>
            {cls.coach && <p className="flex items-center gap-2"><Users className="w-4 h-4 text-surface-400" /> {cls.coach.name}</p>}
            {cls.meeting_url && <a href={cls.meeting_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline"><Video className="w-4 h-4" /> Join meeting</a>}
          </div>
          {cls.notes && <p className="text-sm text-surface-600 bg-surface-50 rounded-lg p-3">{cls.notes}</p>}
          {cls.topics_covered && <div><p className="text-xs font-semibold text-surface-500 uppercase mb-1">Topics Covered</p><p className="text-sm text-surface-700">{cls.topics_covered}</p></div>}
          {cls.homework && <div><p className="text-xs font-semibold text-surface-500 uppercase mb-1">Homework</p><p className="text-sm text-surface-700">{cls.homework}</p></div>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-surface-900">Assigned Students ({students.length})</h4>
              <button onClick={() => setShowAssign(true)} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {students.length === 0 ? <p className="text-sm text-surface-400">No students assigned.</p> : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-50">
                    <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-semibold">{s.name.charAt(0).toUpperCase()}</div>
                    <span className="text-sm text-surface-700 flex-1">{s.name}</span>
                    <button onClick={() => removeStudent(s.id)} className="text-surface-400 hover:text-error-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1"><Edit3 className="w-4 h-4" /> Edit</Button>
            <Button variant="danger" onClick={async () => {
              if (confirm("Delete this class? It will be removed from all student calendars.")) {
                await supabase.from("classes").delete().eq("id", cls.id);
                onChanged(); onClose();
              }
            }} className="flex-1"><Trash2 className="w-4 h-4" /> Delete</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
