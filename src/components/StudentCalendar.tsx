import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, ClassSession } from "@/lib/types";
import { Modal, Spinner, Badge, EmptyState } from "@/components/ui";
import {
  toDateString, monthGrid, formatTime12, formatDateLong,
} from "@/lib/calendarUtils";
import {
  Calendar as CalIcon, Clock, Video, Users, ChevronLeft, ChevronRight,
  GraduationCap, History,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-primary-500", completed: "bg-success-500",
  cancelled: "bg-surface-400", rescheduled: "bg-warning-500",
};

interface StudentClass extends ClassSession {
  course?: { title: string };
  coach?: { name: string };
  class_students?: { student_id: string }[];
  attendance?: { status: string }[];
}

export default function StudentCalendar({ profile }: { profile: Profile }) {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<StudentClass | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    const { data: csLinks } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", profile.id);
    const classIds = (csLinks ?? []).map((l: Record<string, unknown>) => l.class_id as string);
    if (classIds.length === 0) { setClasses([]); setLoading(false); return; }
    const { data } = await supabase
      .from("classes")
      .select("*, course:courses(title), coach:profiles!classes_coach_id_fkey(name), class_students(student_id), attendance(status)")
      .in("id", classIds)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });
    setClasses((data as unknown as StudentClass[]) ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const cells = monthGrid(year, month);
  const byDate: Record<string, StudentClass[]> = {};
  for (const c of classes) {
    (byDate[c.scheduled_date] ??= []).push(c);
  }
  const today = toDateString(new Date());
  const upcoming = classes.filter((c) => c.scheduled_date >= today && c.status === "scheduled");
  const completed = classes.filter((c) => c.status === "completed").reverse();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">My Calendar</h1>
          <p className="text-sm text-surface-500 mt-1">Your classes, schedules, and history</p>
        </div>
        <button onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 bg-surface-800 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-surface-700 transition">
          <History className="w-4 h-4" /> Class History ({completed.length})
        </button>
      </div>

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
                    <button key={c.id} onClick={() => setSelected(c)}
                      className={`w-full text-left text-xs text-white rounded px-1 py-0.5 mb-0.5 truncate block ${STATUS_COLORS[c.status] ?? "bg-surface-400"}`}>
                      {c.start_time?.slice(0, 5)} {c.course?.title ?? c.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <h3 className="font-bold text-surface-900 mb-3">Upcoming Classes</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-surface-400 py-4 text-center">No upcoming classes.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((c) => (
                  <button key={c.id} onClick={() => setSelected(c)} className="w-full text-left p-3 rounded-lg border border-surface-200 hover:bg-surface-50">
                    <p className="font-medium text-surface-900 text-sm">{c.course?.title ?? c.title}</p>
                    <p className="text-xs text-surface-500">{formatDateLong(c.scheduled_date).split(", ").slice(0, 2).join(", ")} • {formatTime12(c.start_time)}</p>
                    <p className="text-xs text-surface-400 mt-1">{c.coach?.name ?? "TBD"} • <span className="capitalize">{c.platform}</span></p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <h3 className="font-bold text-surface-900 mb-3">Recent Completed</h3>
            {completed.length === 0 ? (
              <p className="text-sm text-surface-400 py-4 text-center">No completed classes yet.</p>
            ) : (
              <div className="space-y-2">
                {completed.slice(0, 3).map((c) => (
                  <button key={c.id} onClick={() => setSelected(c)} className="w-full text-left p-3 rounded-lg border border-surface-200 hover:bg-surface-50">
                    <p className="font-medium text-surface-900 text-sm">{c.course?.title ?? c.title}</p>
                    <p className="text-xs text-surface-500">{c.scheduled_date} • {formatTime12(c.start_time)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && <StudentClassDetail cls={selected} onClose={() => setSelected(null)} />}

      {showHistory && (
        <ClassHistoryModal classes={completed} onClose={() => setShowHistory(false)} onSelect={(c) => { setShowHistory(false); setSelected(c); }} />
      )}
    </div>
  );
}

function StudentClassDetail({ cls, onClose }: { cls: StudentClass; onClose: () => void }) {
  const myAttendance = cls.attendance?.[0]?.status;
  const isUpcoming = cls.status === "scheduled" && cls.scheduled_date >= toDateString(new Date());

  return (
    <Modal title={cls.course?.title ?? cls.title} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge color={cls.status === "completed" ? "success" : cls.status === "cancelled" ? "surface" : cls.status === "rescheduled" ? "warning" : "primary"}>{cls.status}</Badge>
          <Badge color="accent">{cls.platform}</Badge>
          {myAttendance && <Badge color={myAttendance === "present" ? "success" : myAttendance === "absent" ? "error" : "warning"}>Attendance: {myAttendance}</Badge>}
        </div>
        <div className="text-sm text-surface-600 space-y-1">
          <p className="flex items-center gap-2"><CalIcon className="w-4 h-4 text-surface-400" /> {formatDateLong(cls.scheduled_date)}</p>
          <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-surface-400" /> {formatTime12(cls.start_time)}{cls.end_time ? ` – ${formatTime12(cls.end_time)}` : ` (${cls.duration_minutes} min)`}</p>
          {cls.coach && <p className="flex items-center gap-2"><Users className="w-4 h-4 text-surface-400" /> Coach {cls.coach.name}</p>}
        </div>
        {cls.meeting_url && isUpcoming && (
          <a href={cls.meeting_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700 transition">
            <Video className="w-5 h-5" /> Join Class
          </a>
        )}
        {cls.meeting_url && !isUpcoming && (
          <a href={cls.meeting_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:underline">
            <Video className="w-4 h-4" /> View meeting link
          </a>
        )}
        {cls.notes && <p className="text-sm text-surface-600 bg-surface-50 rounded-lg p-3">{cls.notes}</p>}

        {cls.status === "completed" && (
          <div className="space-y-3 border-t border-surface-200 pt-3">
            <h4 className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> Class Summary
            </h4>
            {cls.topics_covered && <div><p className="text-xs font-semibold text-surface-500 uppercase mb-1">Topics Covered</p><p className="text-sm text-surface-700">{cls.topics_covered}</p></div>}
            {cls.homework && <div><p className="text-xs font-semibold text-surface-500 uppercase mb-1">Homework</p><p className="text-sm text-surface-700">{cls.homework}</p></div>}
            {cls.skill_focus && <div><p className="text-xs font-semibold text-surface-500 uppercase mb-1">Skill Focus</p><p className="text-sm text-surface-700">{cls.skill_focus}</p></div>}
            {cls.resources_used && <div><p className="text-xs font-semibold text-surface-500 uppercase mb-1">Resources Used</p><p className="text-sm text-surface-700">{cls.resources_used}</p></div>}
            {cls.class_remarks && <div><p className="text-xs font-semibold text-surface-500 uppercase mb-1">Remarks</p><p className="text-sm text-surface-700">{cls.class_remarks}</p></div>}
            {!cls.topics_covered && !cls.homework && !cls.skill_focus && !cls.resources_used && !cls.class_remarks && (
              <p className="text-sm text-surface-400">Coach has not added class notes yet.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ClassHistoryModal({ classes, onClose, onSelect }: {
  classes: StudentClass[];
  onClose: () => void;
  onSelect: (c: StudentClass) => void;
}) {
  return (
    <Modal title="Class History" onClose={onClose} maxWidth="max-w-2xl">
      {classes.length === 0 ? (
        <EmptyState icon={History} message="No completed classes yet." />
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {classes.map((c) => (
            <button key={c.id} onClick={() => onSelect(c)} className="w-full text-left p-3 rounded-lg border border-surface-200 hover:bg-surface-50">
              <div className="flex items-center justify-between">
                <p className="font-medium text-surface-900 text-sm">{c.course?.title ?? c.title}</p>
                <Badge color="success">Completed</Badge>
              </div>
              <p className="text-xs text-surface-500 mt-1">{formatDateLong(c.scheduled_date)} • {formatTime12(c.start_time)}</p>
              {c.topics_covered && <p className="text-xs text-surface-600 mt-1 line-clamp-1">{c.topics_covered}</p>}
              {c.attendance?.length && c.attendance.length > 0 && <p className="text-xs text-surface-400 mt-1">Attendance: {c.attendance[0].status}</p>}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
