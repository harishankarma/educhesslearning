import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/components/Login";
import OwnerDashboard from "@/pages/OwnerDashboard";
import CoachDashboard from "@/pages/CoachDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import { Loader2 } from "lucide-react";

function Router() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!profile) return <Login />;

  switch (profile.role) {
    case "owner": return <OwnerDashboard />;
    case "coach": return <CoachDashboard />;
    case "student": return <StudentDashboard />;
    default: return <Login />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
