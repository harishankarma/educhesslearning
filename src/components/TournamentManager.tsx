import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Tournament, Profile } from "@/lib/types";
import {
  Modal, Field, Button, Spinner, EmptyState, Badge,
} from "@/components/ui";
import { Plus, Trophy, Loader2, CreditCard as Edit3, Trash2, Copy, XCircle, MapPin, Clock, ExternalLink, Calendar as CalIcon, Users } from "lucide-react";

const PLATFORMS = ["Lichess", "Chess.com", "Google Meet", "Zoom", "Custom"];
const TOURNAMENT_TYPES = ["Internal", "Public", "Invitational"];

function localTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function toLocalInputValue(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TournamentManager({ profile }: { profile: Profile }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Record<string, Profile[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("tournaments").select("*").order("start_datetime", { ascending: false });
    setTournaments((data as Tournament[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadParticipants(id: string) {
    const { data } = await supabase.from("tournament_participants").select("student:profiles!tournament_participants_student_id_fkey(*)").eq("tournament_id", id);
    setParticipants((prev) => ({ ...prev, [id]: ((data as unknown as { student: Profile }[]) ?? []).map((d) => d.student).filter(Boolean) }));
  }

  async function handleDelete(t: Tournament) {
    if (!confirm(`Delete tournament "${t.title}"? This cannot be undone.`)) return;
    await supabase.from("tournaments").delete().eq("id", t.id);
    await supabase.from("activity_log").insert({ type: "tournament", message: `Tournament "${t.title}" deleted`, actor_id: profile.id });
    load();
  }

  async function handleDuplicate(t: Tournament) {
    const { title, description, join_link, platform, start_datetime, end_datetime, timezone, tournament_type, notes, max_participants, format, rounds } = t;
    await supabase.from("tournaments").insert({
      title: `${title} (Copy)`, description, join_link, platform,
      start_datetime, end_datetime, timezone, tournament_type, notes,
      max_participants, format, rounds, status: "upcoming",
      tournament_date: t.tournament_date, end_date: t.end_date, location: t.location,
      created_by: profile.id, registration_deadline: t.registration_deadline,
    });
    load();
  }

  async function handleCancel(t: Tournament) {
    if (!confirm(`Cancel tournament "${t.title}"?`)) return;
    await supabase.from("tournaments").update({ status: "cancelled" }).eq("id", t.id);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  const groups: [string, Tournament[]][] = [
    ["Upcoming", tournaments.filter((t) => t.status === "upcoming" || t.status === "registration")],
    ["Live", tournaments.filter((t) => t.status === "ongoing")],
    ["Completed", tournaments.filter((t) => t.status === "completed")],
    ["Cancelled", tournaments.filter((t) => t.status === "cancelled")],
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Tournaments</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-5 h-5" /> Create Tournament</Button>
      </div>

      {tournaments.length === 0 ? (
        <EmptyState icon={Trophy} message="No tournaments yet. Click 'Create Tournament' to add one." />
      ) : (
        <div className="space-y-6">
          {groups.map(([label, list]) => list.length > 0 && (
            <div key={label}>
              <h2 className="text-lg font-bold text-surface-900 mb-3">{label}</h2>
              <div className="space-y-3">
                {list.map((t) => (
                  <div key={t.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-surface-900 truncate">{t.title}</h3>
                          {t.description && <p className="text-sm text-surface-500 mt-1 line-clamp-2">{t.description}</p>}
                        </div>
                        <Badge color={t.status === "completed" ? "surface" : t.status === "ongoing" ? "warning" : t.status === "cancelled" ? "error" : "primary"}>{t.status}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-surface-500 mb-3">
                        {t.start_datetime && (
                          <span className="flex items-center gap-1"><CalIcon className="w-3 h-3" /> {new Date(t.start_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        )}
                        {t.start_datetime && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(t.start_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
                        )}
                        {t.platform && <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {t.platform}</span>}
                        {t.tournament_type && <Badge color="accent">{t.tournament_type}</Badge>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" className="text-sm text-primary-600 px-3 py-1.5" onClick={() => { setEditing(t); setShowForm(true); }}><Edit3 className="w-3.5 h-3.5" /> Edit</Button>
                        <Button variant="ghost" className="text-sm text-primary-600 px-3 py-1.5" onClick={() => handleDuplicate(t)}><Copy className="w-3.5 h-3.5" /> Duplicate</Button>
                        {t.status !== "cancelled" && t.status !== "completed" && (
                          <Button variant="ghost" className="text-sm text-warning-600 px-3 py-1.5" onClick={() => handleCancel(t)}><XCircle className="w-3.5 h-3.5" /> Cancel</Button>
                        )}
                        <Button variant="ghost" className="text-sm text-error-600 px-3 py-1.5" onClick={() => handleDelete(t)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                        <Button variant="ghost" className="text-sm text-surface-600 px-3 py-1.5" onClick={() => { if (expanded === t.id) { setExpanded(null); } else { setExpanded(t.id); loadParticipants(t.id); } }}><Users className="w-3.5 h-3.5" /> Participants</Button>
                      </div>
                    </div>

                    {expanded === t.id && (
                      <div className="border-t border-surface-100 px-4 py-3 bg-surface-50/50">
                        <p className="text-xs font-semibold text-surface-500 mb-2">Registered Participants ({participants[t.id]?.length ?? 0})</p>
                        {(participants[t.id] ?? []).length === 0 ? (
                          <p className="text-sm text-surface-400">No participants registered yet.</p>
                        ) : (
                          <div className="space-y-1">
                            {(participants[t.id] ?? []).map((p) => (
                              <div key={p.id} className="text-sm text-surface-700 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">{p.name.charAt(0).toUpperCase()}</div>
                                {p.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TournamentFormModal
          profileId={profile.id}
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function TournamentFormModal({ profileId, existing, onClose, onSaved }: {
  profileId: string; existing: Tournament | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    platform: existing?.platform ?? "Lichess",
    join_link: existing?.join_link ?? "",
    start_datetime: toLocalInputValue(existing?.start_datetime ?? null),
    end_datetime: toLocalInputValue(existing?.end_datetime ?? null),
    tournament_type: existing?.tournament_type ?? "Internal",
    notes: existing?.notes ?? "",
    max_participants: existing?.max_participants ?? 20,
    format: existing?.format ?? "swiss",
    rounds: existing?.rounds ?? 5,
    registration_deadline: toLocalInputValue(existing?.registration_deadline ?? null),
    status: existing?.status ?? "upcoming",
  });
  const [busy, setBusy] = useState(false);
  const tz = localTz();

  async function save() {
    if (!form.title.trim() || !form.start_datetime) return;
    setBusy(true);
    const startUtc = new Date(form.start_datetime).toISOString();
    const endUtc = form.end_datetime ? new Date(form.end_datetime).toISOString() : null;
    const regDeadline = form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null;
    const startDate = form.start_datetime.slice(0, 10);

    const payload = {
      title: form.title,
      description: form.description,
      platform: form.platform,
      join_link: form.join_link,
      start_datetime: startUtc,
      end_datetime: endUtc,
      timezone: tz,
      tournament_type: form.tournament_type,
      notes: form.notes,
      max_participants: form.max_participants,
      format: form.format,
      rounds: form.rounds,
      registration_deadline: regDeadline,
      tournament_date: startDate,
      end_date: endUtc ? endUtc.slice(0, 10) : startDate,
      location: form.platform,
      status: form.status,
    };

    if (existing) {
      await supabase.from("tournaments").update(payload).eq("id", existing.id);
      await supabase.from("activity_log").insert({ type: "tournament", message: `Tournament "${form.title}" updated`, actor_id: profileId });
    } else {
      await supabase.from("tournaments").insert({ ...payload, created_by: profileId });
      await supabase.from("activity_log").insert({ type: "tournament", message: `Tournament "${form.title}" created`, actor_id: profileId });
    }
    setBusy(false);
    onSaved();
  }

  return (
    <Modal title={existing ? "Edit Tournament" : "Create Tournament"} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <Field label="Tournament Name"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Platform"><select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">{PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          <Field label="Tournament Type"><select value={form.tournament_type} onChange={(e) => setForm({ ...form, tournament_type: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none">{TOURNAMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
        </div>

        <Field label="Tournament Join Link"><input value={form.join_link} onChange={(e) => setForm({ ...form, join_link: e.target.value })} placeholder="https://lichess.org/tournament/..." className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Start Time (${tz})`}><input type="datetime-local" value={form.start_datetime} onChange={(e) => setForm({ ...form, start_datetime: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="End Time (optional)"><input type="datetime-local" value={form.end_datetime} onChange={(e) => setForm({ ...form, end_datetime: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        </div>

        <Field label="Registration Deadline (optional)"><input type="datetime-local" value={form.registration_deadline} onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Max Participants"><input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: +e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
          <Field label="Format"><select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as Tournament["format"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="swiss">Swiss</option><option value="round-robin">Round Robin</option><option value="knockout">Knockout</option></select></Field>
          <Field label="Rounds"><input type="number" value={form.rounds} onChange={(e) => setForm({ ...form, rounds: +e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none" /></Field>
        </div>

        {existing && (
          <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Tournament["status"] })} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none"><option value="upcoming">Upcoming</option><option value="registration">Registration</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>
        )}

        <Field label="Notes (optional)"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 outline-none resize-none" /></Field>

        <Button onClick={save} disabled={busy || !form.title.trim() || !form.start_datetime} className="w-full">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />} {existing ? "Save Changes" : "Create Tournament"}</Button>
      </div>
    </Modal>
  );
}
