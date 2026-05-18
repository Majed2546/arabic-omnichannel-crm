"use client";

import { Panel } from "@/components/Panel";
import { Shell } from "@/components/Shell";
import { API_BASE } from "@/lib/api";
import { ar, localizeValue } from "@/lib/i18n";
import { Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Overlap = {
  id: string;
  source_name: string;
  target_name: string;
  overlap_type: string;
  score: number;
  explanation: string;
  recommendation: string;
};

export default function OverlapsPage() {
  const [items, setItems] = useState<Overlap[]>([]);
  async function load() {
    const response = await fetch(`${API_BASE}/api/overlaps`, { cache: "no-store" });
    setItems(await response.json());
  }
  async function run() {
    await fetch(`${API_BASE}/api/overlaps/run`, { method: "POST" });
    await load();
  }
  useEffect(() => {
    load();
  }, []);
  const names = useMemo(() => Array.from(new Set(items.flatMap((x) => [x.source_name, x.target_name]))).slice(0, 8), [items]);
  return (
    <Shell>
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Panel title={ar.overlaps.heatmap} action={<button onClick={run} className="rounded bg-teal p-2 text-white" title={ar.overlaps.runDetection}><Play size={16} /></button>}>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1 text-xs">
              <tbody>
                <tr>
                  <td className="matrix-cell" />
                  {names.map((name) => <th key={name} className="matrix-cell p-1 text-right font-medium">{name}</th>)}
                </tr>
                {names.map((row) => (
                  <tr key={row}>
                    <th className="matrix-cell p-1 text-right font-medium">{row}</th>
                    {names.map((col) => {
                      const hit = items.find((x) => (x.source_name === row && x.target_name === col) || (x.source_name === col && x.target_name === row));
                      const score = hit?.score ?? 0;
                      const bg = score > 75 ? "bg-rose text-white" : score > 60 ? "bg-gold text-white" : score > 0 ? "bg-teal text-white" : "bg-white";
                      return <td key={col} className={`matrix-cell rounded-xl border border-white text-center font-bold shadow-sm ${bg}`}>{row === col ? "-" : score || ""}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={ar.overlaps.findings}>
          <div className="grid max-h-[620px] gap-3 overflow-auto">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:border-teal/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.source_name} / {item.target_name}</p>
                  <span className="rounded bg-mist px-2 py-1 font-semibold text-teal">{item.score}</span>
                </div>
                <p className="mt-2 text-slate-600">{localizeValue(item.overlap_type)}</p>
                <p className="mt-2">{item.explanation}</p>
                <p className="mt-2 font-semibold text-gold">{localizeValue(item.recommendation)}</p>
              </div>
            ))}
            {items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد تداخلات مكتشفة حتى الآن.</div> : null}
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
