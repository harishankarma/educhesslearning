import { useState, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Role, Notification } from "@/lib/types";
import {
  LogOut, LayoutDashboard, BookOpen, MessageSquare, Users, Calendar,
  Trophy, CreditCard, Bell, Library, FileText, GraduationCap, ClipboardList,
  Megaphone, Search, Award, BarChart3, ScrollText, Video,
} from "lucide-react";

export type Tab =
  | "dashboard" | "courses" | "messages" | "manage" | "calendar"
  | "tournaments" | "finance" | "notifications" | "library"
  | "reports" | "certificates" | "assignments" | "announcements"
  | "attendance" | "students" | "games" | "audit" | "search";

interface LayoutProps {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  role: Role;
}

const roleLabel: Record<Role, string> = {
  owner: "Academy Owner",
  coach: "Coach",
  student: "Student",
};

const ownerTabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "manage", label: "Manage", icon: Users },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "attendance", label: "Attendance", icon: ClipboardList },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "tournaments", label: "Tournaments", icon: Trophy },
  { key: "finance", label: "Finance", icon: CreditCard },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "library", label: "Library", icon: Library },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "certificates", label: "Certificates", icon: Award },
  { key: "audit", label: "Audit Log", icon: ScrollText },
  { key: "messages", label: "Messages", icon: MessageSquare },
];

const coachTabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "attendance", label: "Attendance", icon: ClipboardList },
  { key: "assignments", label: "Assignments", icon: FileText },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "tournaments", label: "Tournaments", icon: Trophy },
  { key: "students", label: "Students", icon: Users },
  { key: "games", label: "Game Analysis", icon: Video },
  { key: "messages", label: "Messages", icon: MessageSquare },
];

const studentTabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "assignments", label: "Assignments", icon: FileText },
  { key: "games", label: "Game Analysis", icon: Video },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "tournaments", label: "Tournaments", icon: Trophy },
  { key: "certificates", label: "Certificates", icon: Award },
  { key: "messages", label: "Messages", icon: MessageSquare },
];

export default function Layout({ children, activeTab, onTabChange, role }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: string; label: string; sub: string }[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const tabs = role === "owner" ? ownerTabs : role === "coach" ? coachTabs : studentTabs;

  // Load notifications
  useState(() => {
    if (!profile) return;
    supabase.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data) {
          setNotifications(data as Notification[]);
          setUnreadCount((data as Notification[]).filter(n => !n.is_read).length);
        }
      });
  });

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const results: { type: string; label: string; sub: string }[] = [];
    const [students, coaches, courses, tournaments] = await Promise.all([
      supabase.from("profiles").select("name,email").ilike("name", `%${q}%`).limit(5),
      supabase.from("profiles").select("name,email").eq("role", "coach").ilike("name", `%${q}%`).limit(5),
      supabase.from("courses").select("title,description").ilike("title", `%${q}%`).limit(5),
      supabase.from("tournaments").select("title").ilike("title", `%${q}%`).limit(5),
    ]);
    (students.data ?? []).forEach((s: { name: string; email: string }) => results.push({ type: "Student", label: s.name, sub: s.email }));
    (coaches.data ?? []).forEach((c: { name: string; email: string }) => results.push({ type: "Coach", label: c.name, sub: c.email }));
    (courses.data ?? []).forEach((c: { title: string; description: string }) => results.push({ type: "Course", label: c.title, sub: c.description ?? "" }));
    (tournaments.data ?? []).forEach((t: { title: string }) => results.push({ type: "Tournament", label: t.title, sub: "" }));
    setSearchResults(results);
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <header className="bg-surface-900 text-white shadow-lg z-30 sticky top-0">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/educhess_acadmy_trivandrum_logo.png" alt="EduChess Academy Trivandrum" className="w-11 h-11 object-contain" />
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg leading-tight">EduChess Academy</h1>
              <p className="text-xs text-surface-400 leading-tight">Trivandrum</p>
            </div>
          </div>

          {/* Global search */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block relative">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search students, coaches, courses..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-800 text-sm text-white placeholder-surface-500 outline-none focus:ring-2 focus:ring-primary-500"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-surface-200 max-h-80 overflow-y-auto z-50">
                {searchResults.map((r, i) => (
                  <div key={i} className="px-4 py-2.5 hover:bg-surface-50 border-b border-surface-100 last:border-0 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">{r.type}</span>
                      <span className="text-sm font-medium text-surface-900">{r.label}</span>
                    </div>
                    {r.sub && <p className="text-xs text-surface-500 mt-0.5">{r.sub}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg hover:bg-surface-800 transition">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 rounded-full text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-lg shadow-xl border border-surface-200 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
                      <span className="font-semibold text-surface-900 text-sm">Notifications</span>
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">Mark all read</button>}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-surface-400">No notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-surface-100 last:border-0 ${!n.is_read ? "bg-primary-50/50" : ""}`}>
                          <div className="flex items-start gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${notifCategoryColor(n.category)}`}>{n.category}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-900">{n.title}</p>
                              <p className="text-xs text-surface-500">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="text-xs text-surface-400">{roleLabel[profile.role]}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-surface-800 transition" title="Sign out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-60 bg-white border-r border-surface-200 flex-col">
          <nav className="px-3 py-4 space-y-0.5 overflow-y-auto flex-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === key
                    ? "bg-primary-50 text-primary-700"
                    : "text-surface-600 hover:bg-surface-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile nav - scrollable horizontal */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-30 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-3 text-xs font-medium transition min-w-[70px] ${
                  activeTab === key ? "text-primary-600" : "text-surface-500"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}

function notifCategoryColor(cat: string): string {
  const colors: Record<string, string> = {
    payment: "bg-success-50 text-success-700",
    attendance: "bg-accent-50 text-accent-700",
    class: "bg-primary-50 text-primary-700",
    system: "bg-surface-100 text-surface-600",
    tournament: "bg-error-50 text-error-700",
    assignment: "bg-warning-50 text-warning-600",
  };
  return colors[cat] ?? "bg-surface-100 text-surface-600";
}
