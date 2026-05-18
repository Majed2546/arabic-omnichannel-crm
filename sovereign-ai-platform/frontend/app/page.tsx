"use client";

import { ActionCard } from "@/components/ActionCard";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { Shell } from "@/components/Shell";
import { API_BASE, type Summary } from "@/lib/api";
import { ar } from "@/lib/i18n";
import { CircleAlert, Clock3, FileText, Radar, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState } from "react";

const emptySummary = { documents: 0, pending_capabilities: 0, validated_capabilities: 0, overlap_findings: 0, avg_overlap_score: 0 };

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary>(emptySummary);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/summary`, { cache: "no-store" })
      .then((response) => response.json())
      .then(setSummary)
      .catch(() => setSummary(emptySummary));
  }, []);

  const hasData = summary.documents > 0 || summary.pending_capabilities > 0 || summary.validated_capabilities > 0 || summary.overlap_findings > 0;

  return (
    <Shell>
      <main className="space-y-6">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={ar.dashboard.documents} value={summary.documents} helper="ملفات تم تحليلها داخل النظام" icon={FileText} />
          <KpiCard label={ar.dashboard.pendingValidation} value={summary.pending_capabilities} helper="قدرات تحتاج مراجعة واعتماد" icon={CircleAlert} tone="gold" />
          <KpiCard label={ar.dashboard.validatedCapabilities} value={summary.validated_capabilities} helper="قدرات معتمدة في خريطة القدرات" icon={ShieldCheck} />
          <KpiCard label={ar.dashboard.overlapFindings} value={summary.overlap_findings} helper="تداخلات تحتاج قرارًا إداريًا" icon={Radar} tone="rose" />
        </section>

        {!hasData ? (
          <section className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
            <FileText className="mx-auto text-slate-300" size={42} />
            <h2 className="type-section-title mt-4 text-ink">لا توجد بيانات بعد</h2>
            <p className="type-body mx-auto mt-2 max-w-2xl text-slate-600">ابدأ برفع وثيقة لاستخراج القدرات وبناء خريطة أولية للبنية المؤسسية للتطبيقات.</p>
            <div className="mt-6 flex justify-center">
              <ActionCard title="رفع وثيقة" description="إضافة ملف جديد لاستخراج القدرات." icon={Upload} href="/upload" primary />
            </div>
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <SectionCard title="إجراءات سريعة">
              <div className="grid gap-3 md:grid-cols-2">
                <ActionCard title="رفع وثيقة" description="إضافة ملف جديد لاستخراج القدرات." icon={Upload} href="/upload" primary />
                <ActionCard title={ar.dashboard.reviewCapabilities} description="مراجعة واعتماد القدرات المستخرجة." icon={ShieldCheck} href="/review" />
              </div>
            </SectionCard>

            <SectionCard title={ar.dashboard.recentActivity}>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal/10 text-teal"><Clock3 size={18} /></span>
                  <div>
                    <p className="type-card-title text-ink">آخر تحديث للملخص</p>
                    <p className="type-body mt-1 text-slate-600">تم تحديث المؤشرات من بيانات القدرات والوثائق المتاحة.</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </section>
        )}
      </main>
    </Shell>
  );
}
