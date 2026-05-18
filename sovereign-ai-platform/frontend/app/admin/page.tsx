"use client";

import { Shell } from "@/components/Shell";
import { API_BASE } from "@/lib/api";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

type NormalizationResult = {
  migration: string;
  migration_timestamp: string;
  processed_extracted: number;
  processed_published: number;
  normalized_extracted: number;
  normalized_published: number;
  samples?: Array<{ type: string; id: string; before: Record<string, string | null>; after: Record<string, string | null> }>;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NormalizationResult | null>(null);
  const [error, setError] = useState("");

  async function normalizeCapabilities() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/ontology/normalize-capabilities`, { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("normalization failed");
      setResult(await response.json());
    } catch {
      setError("تعذر تنفيذ إعادة التوحيد. تحقق من خدمة الواجهة الخلفية.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <main className="space-y-5">
        <section className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.055)]">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal"><Sparkles size={16} /> أدوات إدارة البيانات</p>
          <h1 className="mt-2 text-3xl font-black text-ink">إدارة توحيد القدرات</h1>
          <p className="mt-3 max-w-3xl text-[15px] font-semibold leading-7 text-slate-600">
            شغّل إعادة توحيد أسماء القدرات لتطبيق قواعد التسمية العربية والإنجليزية على القدرات الحالية.
          </p>
          <button
            onClick={normalizeCapabilities}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal px-5 py-3 text-[15px] font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={17} />
            إعادة توحيد أسماء القدرات
          </button>
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        </section>

        {result ? (
          <section className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.055)]">
            <h2 className="text-2xl font-black text-ink">نتيجة التوحيد</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Metric label="القدرات المستخرجة" value={result.processed_extracted} />
              <Metric label="المستخرجة المعدلة" value={result.normalized_extracted} />
              <Metric label="القدرات المنشورة" value={result.processed_published} />
              <Metric label="المنشورة المعدلة" value={result.normalized_published} />
            </div>
            <div className="mt-5 space-y-2">
              {(result.samples || []).map((sample) => (
                <div key={`${sample.type}-${sample.id}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[15px] font-bold text-ink">{sample.after.name}</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-500 ltr" dir="ltr">{sample.after.standardized_name}</p>
                  <p className="mt-2 text-[13px] font-semibold text-slate-500">الأصل: {sample.before.name}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
      <p className="text-3xl font-black text-ink ltr">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}
