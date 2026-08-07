import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Tournament, Profile } from "@/lib/types";
import {
  Trophy, Loader2, Calendar as CalIcon, Clock, ExternalLink, MapPin,
  ChevronLeft, ChevronRight, PlayCircle, CheckCircle2, XCircle,
} from "lucide-react";

function localTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getStatusLabel(t: Tournament): "Upcoming" | "Live" | "Completed" | "Cancelled" {
  if (t.status === "cancelled") return "Cancelled";
  if (t.status === "completed") return "Completed";
  if (t.status === "ongoing") return "Live";
  return "Upcoming";
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Live": return "bg-error-50 text-error-700 ring-2 ring-error-200";
    case "Upcoming": return "bg-primary-50 text-primary-700 ring-2 ring-primary-200";
    case "Completed": return "bg-surface-100 text-surface-600";
    case "Cancelled": return "bg-surface-100 text-surface-500 line-through";
    default: return "bg-surface-100 text-surface-600";
  }
}

function getCountdown(t: Tournament): string | null {
  if (!t.start_datetime) return null;
  const now = new Date();
  const start = new Date(t.start_datetime);
  const diff = start.getTime() - now.getTime();
  if (diff <= 0) {
    if (t.end_datetime && new Date(t.end_datetime).getTime() > now.getTime()) return "Live now";
    return null;
  }
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Starts in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `Starts in ${hours} hour${hours > 1 ? "s" : ""}`;
  const mins = Math.floor(diff / 60000);
  return `Starts in ${mins} min`;
}

export default function StudentTournaments({ profile: _profile }: { profile: Profile }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const tz = localTz();

  const load = useCallback(async () => {
    const { data } = await supabase.from("tournaments").select("*").neq("status", "cancelled").order("start_datetime", { ascending: true });
    setTournaments((data as Tournament[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tournamentsByDate = useMemo(() => {
    const map: Record<string, Tournament[]> = {};
    for (const t of tournaments) {
      if (!t.start_datetime) continue;
      const localDate = new Date(t.start_datetime).toLocaleDateString("en-CA");
      if (!map[localDate]) map[localDate] = [];
      map[localDate].push(t);
    }
    return map;
  }, [tournaments]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const todayStr = new Date().toLocaleDateString("en-CA");
  const selectedTournaments = selectedDate ? (tournamentsByDate[selectedDate] ?? []) : [];

  const upcoming = useMemo(() => {
    const now = new Date();
    return tournaments
      .filter((t) => t.start_datetime && new Date(t.start_datetime) > now && t.status !== "completed" && t.status !== "cancelled")
      .sort((a, b) => new Date(a.start_datetime!).getTime() - new Date(b.start_datetime!).getTime())
      .slice(0, 5);
  }, [tournaments]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-surface-900">Tournament Calendar</h1>
        <p className="text-sm text-surface-500 mt-1">All times shown in your local timezone: <span className="font-medium text-surface-700">{tz}</span></p>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-surface-100 transition"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-bold text-surface-900">{currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-surface-100 transition"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-surface-500 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasTournament = !!tournamentsByDate[dateStr];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={i}
                onClick={() => hasTournament && setSelectedDate(dateStr)}
                className={`min-h-14 sm:min-h-16 rounded-lg border p-1.5 transition flex flex-col items-center justify-start ${
                  isSelected ? "border-primary-500 bg-primary-50" : hasTournament ? "border-primary-200 bg-primary-50/50 hover:bg-primary-50" : "border-surface-100 hover:bg-surface-50"
                } ${!hasTournament ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className={`text-xs font-medium ${isToday ? "text-primary-700 font-bold" : "text-surface-600"}`}>{day}</span>
                {hasTournament && (
                  <span className="mt-1 flex items-center gap-0.5">
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                    {tournamentsByDate[dateStr].length > 1 && <span className="text-xs text-primary-600 font-semibold">×{tournamentsByDate[dateStr].length}</span>}
                  </span>
                )}
                {isToday && <span className="text-xs text-primary-500 font-medium">Today</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day tournaments */}
      {selectedDate && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-surface-900 mb-3 flex items-center gap-2">
            <CalIcon className="w-5 h-5 text-primary-600" />
            {new Date(selectedDate + "T00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h2>
          {selectedTournaments.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-8 text-center text-surface-400"><Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No tournaments on this date.</p></div>
          ) : (
            <div className="space-y-3">
              {selectedTournaments.map((t) => <TournamentCard key={t.id} t={t} tz={tz} />)}
            </div>
          )}
        </div>
      )}

      {/* Upcoming tournaments */}
      <div>
        <h2 className="text-lg font-bold text-surface-900 mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-primary-600" /> Upcoming Tournaments</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-surface-200 p-8 text-center text-surface-400"><Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No upcoming tournaments scheduled.</p></div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((t) => <TournamentCard key={t.id} t={t} tz={tz} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentCard({ t, tz }: { t: Tournament; tz: string }) {
  const status = getStatusLabel(t);
  const countdown = getCountdown(t);
  const startLocal = t.start_datetime ? new Date(t.start_datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }) : "TBD";
  const endLocal = t.end_datetime ? new Date(t.end_datetime).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }) : null;

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-surface-900 text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-500 flex-shrink-0" />
            {t.title}
          </h3>
          {t.description && <p className="text-sm text-surface-500 mt-1 line-clamp-2">{t.description}</p>}
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 ${getStatusColor(status)}`}>
          {status === "Live" && <PlayCircle className="w-3 h-3" />}
          {status === "Completed" && <CheckCircle2 className="w-3 h-3" />}
          {status === "Cancelled" && <XCircle className="w-3 h-3" />}
          {status}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-surface-600 mb-3">
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-surface-400" /> {startLocal}{endLocal && ` — ${endLocal}`}</span>
        {t.platform && <span className="flex items-center gap-1.5"><ExternalLink className="w-4 h-4 text-surface-400" /> {t.platform}</span>}
        {t.tournament_type && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-surface-400" /> {t.tournament_type}</span>}
      </div>

      {countdown && (
        <div className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4" /> {countdown}
        </div>
      )}

      {t.notes && <p className="text-sm text-surface-500 mb-3 italic">{t.notes}</p>}

      {t.join_link && status !== "Completed" && status !== "Cancelled" && (
        <a href={t.join_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition text-sm">
          <ExternalLink className="w-4 h-4" /> Join Tournament
        </a>
      )}
    </div>
  );
}
