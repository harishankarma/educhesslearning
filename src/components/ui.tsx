import { ReactNode } from "react";
import { X, Loader2 } from "lucide-react";

export function Modal({ title, onClose, children, maxWidth = "max-w-md" }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} p-6 my-8 animate-slide-up`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", disabled, className = "" }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-primary-600 text-white hover:bg-primary-700",
    secondary: "bg-surface-800 text-white hover:bg-surface-700",
    danger: "bg-error-600 text-white hover:bg-error-700",
    ghost: "text-surface-600 hover:bg-surface-100",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2.5 transition disabled:opacity-60 ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof import("lucide-react").Users;
  label: string;
  value: number | string;
  color: "primary" | "accent" | "success" | "warning" | "error";
}) {
  const colors: Record<string, string> = {
    primary: "bg-primary-50 text-primary-700",
    accent: "bg-accent-50 text-accent-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-600",
    error: "bg-error-50 text-error-600",
  };
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-surface-900">{value}</p>
        <p className="text-sm text-surface-500">{label}</p>
      </div>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`w-6 h-6 animate-spin text-primary-500 ${className}`} />;
}

export function EmptyState({ icon: Icon, message }: { icon: typeof import("lucide-react").BookOpen; message: string }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-12 text-center text-surface-400">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  );
}

export function Badge({ children, color = "surface" }: {
  children: ReactNode;
  color?: "surface" | "primary" | "success" | "warning" | "error" | "accent";
}) {
  const colors: Record<string, string> = {
    surface: "bg-surface-100 text-surface-600",
    primary: "bg-primary-50 text-primary-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-600",
    error: "bg-error-50 text-error-600",
    accent: "bg-accent-50 text-accent-700",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[color]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, color = "primary" }: {
  value: number;
  max: number;
  color?: "primary" | "success" | "warning" | "error";
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors: Record<string, string> = {
    primary: "bg-primary-500",
    success: "bg-success-500",
    warning: "bg-warning-500",
    error: "bg-error-500",
  };
  return (
    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
      <div className={`h-full ${colors[color]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}
