import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "gold" | "rose" | "slate" }) {
  const styles = {
    teal: "border-teal/20 bg-teal/10 text-teal",
    gold: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <span className={`type-badge inline-flex items-center rounded-full border px-3.5 py-1.5 ${styles[tone]}`}>
      {children}
    </span>
  );
}
