import type { LucideIcon } from "lucide-react";

export function StepCard({ index, title, description, icon: Icon }: { index: number; title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="relative flex gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal">
        <Icon size={22} />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ltr">{index}</span>
          <h4 className="type-card-title">{title}</h4>
        </div>
        <p className="type-body mt-2">{description}</p>
      </div>
    </div>
  );
}
