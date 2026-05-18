import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone?: "teal" | "gold" | "rose";
}) {
  const styles = {
    teal: "bg-teal/10 text-teal",
    gold: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="group rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-executive">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-meta font-semibold text-slate-700">{label}</p>
          <p className="mt-3 font-english text-4xl font-extrabold tracking-normal text-ink ltr">{value}</p>
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${styles[tone]}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="type-body mt-3 text-slate-700">{helper}</p>
    </div>
  );
}
