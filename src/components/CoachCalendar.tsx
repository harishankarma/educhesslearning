import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, ClassSession } from "@/lib/types";
import { Modal, Field, Button, Spinner, Badge } from "@/components/ui";
import {
  toDateString, monthGrid, formatTime12, formatDateLong,
} from "@/lib/calendarUtils";
import {
  Loader2, X, Calendar as CalIcon, Users, Clock, Video,
  ChevronLeft, ChevronRight, ClipboardList, PlayCircle, BookOpen,
  Save, CheckCircle2, GraduationCap,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-primary-500", completed: "bg-success-500",
  cancelled: "bg-surface-400", rescheduled: "bg-warning-500",
};

interface ClassWithRelations extends ClassSession {
  course?: { title: string };
  class_students?: { student_id: string }[];
}

export default function CoachCalendar({ profile }: { profile: Profile }) {
  const [classes, setClasses] = useState<ClassWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<ClassWithRelations | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("classes")
      .select("*, course:courses(title), class_students(student_id)")
      .eq("coach_id", profile.id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });
    setClasses((data as unknown as ClassWithRelations[]) ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const cells = monthGrid(year, month);
  const byDate: Record<string, ClassWithRelations[]> = {};
  for (const c of classes) {
    (byDate[c.scheduled_date] ??= []).push(c);
  }
  const today = toDateString(new Date());

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900 mb-1">My Calendar</h1>
      <p className="text-sm text-surface-500 mb-6">View your classes, mark attendance, and log teaching notes</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-4">
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
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="min-h-16" />;
              const ds = toDateString(date);
              const dayClasses = byDate[ds] ?? [];
              const isToday = ds === today;
              return (
                <div key={i} className={`min-h-16 rounded-lg border p-1 ${dayClasses.length > 0 ? "bg-surface-50 border-surface-200" : "border-surface-100"} ${isToday ? "ring-2 ring-primary-300" : ""}`}>
                  <p className={`text-xs font-medium ${isToday ? "text-primary-700" : "text-surface-600"}`}>{date.getDate()}</p>
                  {dayClasses.map((c) => (
                    <button key={c.id} onClick={() => setSelectedClass(c)}
                      className={`w-full text-left text-xs text-white rounded px-1 py-0.5 mb-0.5 truncate block ${STATUS_COLORS[c.status] ?? "bg-surface-400"}`}>
                      {c.start_time?.slice(0, 5)} {c.course?.title ?? c.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <h3 className="font-bold text-surface-900 mb-3">Upcoming Classes</h3>
          {(() => {
            const upcoming = classes.filter((c) => c.scheduled_date >= today && c.status === "scheduled").slice(0, 5);
            if (upcoming.length === 0) return <p className="text-sm text-surface-400 py-4 text-center">No upcoming classes.</p>;
            return (
              <div className="space-y-2">
                {upcoming.map((c) => (
                  <button key={c.id} onClick={() => setSelectedClass(c)} className="w-full text-left p-3 rounded-lg border border-surface-200 hover:bg-surface-50">
                    <p className="font-medium text-surface-900 text-sm">{c.course?.title ?? c.title}</p>
                    <p className="text-xs text-surface-500">{formatDateLong(c.scheduled_date).split(", ").slice(0, 2).join(", ")} • {formatTime12(c.start_time)}</p>
                    <p className="text-xs text-surface-400 mt-1">{c.class_students?.length ?? 0} students • <span className="capitalize">{c.platform}</span></p>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {selectedClass && (
        <CoachClassDetailModal
          cls={selectedClass}
          coachId={profile.id}
          onClose={() => setSelectedClass(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function CoachClassDetailModal({ cls, coachId, onClose, onChanged }: {
  cls: ClassWithRelations;
  coachId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const [existingAttendance, setExistingAttendance] = useState(false);
  const [teachingLog, setTeachingLog] = useState({
    topics_covered: cls.topics_covered ?? "", homework: cls.homework ?? "",
    skill_focus: cls.skill_focus ?? "", resources_used: cls.resources_used ?? "",
    class_remarks: cls.class_remarks ?? "",
  });
  const [view, setView] = useState<"details" | "attendance" | "teaching">("details");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const studentIds = (cls.class_students ?? []).map((cs) => cs.student_id);
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", studentIds).order("name");
        setStudents((profiles as Profile[]) ?? []);
        const { data: att } = await supabase.from("attendance").select("*").eq("class_id", cls.id);
        if (att && att.length > 0) {
          setExistingAttendance(true);
          const sMap: Record<string, "present" | "absent" | "late" | "excused"> = {};
          att.forEach((a: Record<string, unknown>) => {
            sMap[a.student_id as string] = a.status as "present" | "absent" | "late" | "excused";
          });
          setAttendance(sMap);
        }
      }
    }
    load();
  }, [cls]);

  async function submitAttendance() {
    setBusy(true);
    const records = students.map((s) => ({
      class_id: cls.id, student_id: s.id,
      status: attendance[s.id] ?? "absent",
      marked_by: coachId,
    }));
    await supabase.from("attendance").upsert(records, { onConflict: "class_id,student_id" });
    await supabase.from("classes").update({ status: "completed" }).eq("id", cls.id);
    await supabase.from("activity_log").insert({
      type: "attendance_submitted",
      message: `Attendance submitted for ${cls.course?.title ?? cls.title}`,
      actor_id: coachId,
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onChanged(); onClose(); }, 1200);
  }

  async function saveTeachingLog() {
    setBusy(true);
    await supabase.from("classes").update({
      topics_covered: teachingLog.topics_covered,
      homework: teachingLog.homework,
      skill_focus: teachingLog.skill_focus,
      resources_used: teachingLog.resources_used,
      class_remarks: teachingLog.class_remarks,
    }).eq("id", cls.id);
    await supabase.from("activity_log").insert({
      type: "teaching_log_saved",
      message: `Teaching log saved for ${cls.course?.title ?? cls.title}`,
      actor_id: coachId,
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Modal title={cls.course?.title ?? cls.title} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex gap-1 border-b border-surface-200 mb-4 -mt-2">
        {([
          ["details", "Details", CalIcon],
          ["attendance", "Attendance", ClipboardList],
          ["teaching", "Teaching Log", BookOpen],
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setView(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${
              view === key ? "border-primary-500 text-primary-600" : "border-transparent text-surface-500 hover:text-surface-700"
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {view === "details" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge color={cls.status === "completed" ? "success" : cls.status === "cancelled" ? "surface" : cls.status === "rescheduled" ? "warning" : "primary"}>{cls.status}</Badge>
            <Badge color="accent">{cls.platform}</Badge>
          </div>
          <div className="text-sm text-surface-600 space-y-1">
            <p className="flex items-center gap-2"><CalIcon className="w-4 h-4 text-surface-400" /> {formatDateLong(cls.scheduled_date)}</p>
            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-surface-400" /> {formatTime12(cls.start_time)}{cls.end_time ? ` – ${formatTime12(cls.end_time)}` : ` (${cls.duration_minutes} min)`}</p>
            {cls.meeting_url && <a href={cls.meeting_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline"><Video className="w-4 h-4" /> Join meeting</a>}
          </div>
          {cls.notes && <p className="text-sm text-surface-600 bg-surface-50 rounded-lg p-3">{cls.notes}</p>}
          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Assigned Students ({students.length})
            </h4>
            {students.length === 0 ? <p className="text-sm text-surface-400">No students assigned to this class.</p> : (
              <div className="space-y-1">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-50">
                    <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-semibold">{s.name.charAt(0).toUpperCase()}</div>
                    <span className="text-sm text-surface-700">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {cls.status === "scheduled" && students.length > 0 && (
            <Button onClick={() => setView("attendance")} className="w-full">
              <PlayCircle className="w-5 h-5" /> Start Class / Mark Attendance
            </Button>
          )}
        </div>
      )}

      {view === "attendance" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-surface-900">Mark Attendance</h4>
            {existingAttendance && <Badge color="success">Already marked</Badge>}
          </div>
          {students.length === 0 ? (
            <p className="text-sm text-surface-400 py-4 text-center">No students assigned. Ask the admin to assign students to this class.</p>
          ) : (
            <>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200">
                    <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">{s.name.charAt(0).toUpperCase()}</div>
                    <span className="font-medium text-surface-900 flex-1 text-sm">{s.name}</span>
                    <div className="flex gap-1">
                      {(["present", "absent", "late", "excused"] as const).map((st) => (
                        <button key={st} onClick={() => setAttendance({ ...attendance, [s.id]: st })}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${
                            (attendance[s.id] ?? "absent") === st
                              ? st === "present" ? "bg-success-500 text-white" : st === "absent" ? "bg-error-500 text-white" : st === "late" ? "bg-warning-500 text-white" : "bg-surface-500 text-white"
                              : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                          }`}>{st.charAt(0).toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={submitAttendance} disabled={busy} className="w-full">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                {saved ? "Saved!" : "Submit Attendance & Complete Class"}
              </Button>
            </>
          )}
        </div>
      )}

      {view === "teaching" && (
        <div className="space-y-4">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-sm text-primary-800">
            <GraduationCap className="w-4 h-4 inline mr-1" />
            Fill in what was covered in this class. Students can see this in their class history.
          </div>
          <Field label="Topics Covered">
            <textarea value={teachingLog.topics_covered} onChange={(e) => setTeachingLog({ ...teachingLog, topics_covered: e.target.value })}
              rows={2} placeholder="e.g. Italian Game, pawn structures, tactical motifs..."
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" />
          </Field>
          <Field label="Homework">
            <textarea value={teachingLog.homework} onChange={(e) => setTeachingLog({ ...teachingLog, homework: e.target.value })}
              rows={2} placeholder="e.g. Solve 20 puzzles, review game 5..."
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Skill Focus">
              <input value={teachingLog.skill_focus} onChange={(e) => setTeachingLog({ ...teachingLog, skill_focus: e.target.value })}
                placeholder="e.g. Endgame technique"
                className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
            </Field>
            <Field label="Resources Used">
              <input value={teachingLog.resources_used} onChange={(e) => setTeachingLog({ ...teachingLog, resources_used: e.target.value })}
                placeholder="e.g. Lichess studies, PDF handout"
                className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" />
            </Field>
          </div>
          <Field label="Remarks">
            <textarea value={teachingLog.class_remarks} onChange={(e) => setTeachingLog({ ...teachingLog, class_remarks: e.target.value })}
              rows={2} placeholder="General notes about the class..."
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" />
          </Field>
          <Button onClick={saveTeachingLog} disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? "Saved!" : "Save Teaching Log"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
