import type { ReactNode } from "react";
import { SectionCard } from "@/components/SectionCard";

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <SectionCard title={title} action={action}>{children}</SectionCard>;
}

export function Stat({ label, value, tone = "teal" }: { label: string; value: string | number; tone?: "teal" | "gold" | "rose" }) {
  const color = tone === "gold" ? "text-gold" : tone === "rose" ? "text-rose" : "text-teal";
  return (
    <div className="rounded-[22px] border border-line bg-white p-4">
      <p className="type-meta">{label}</p>
      <p className={`mt-2 font-english text-3xl font-semibold ltr ${color}`}>{value}</p>
    </div>
  );
}
