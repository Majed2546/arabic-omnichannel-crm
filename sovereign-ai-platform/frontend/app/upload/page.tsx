"use client";

import { Panel } from "@/components/Panel";
import { Shell } from "@/components/Shell";
import { API_BASE } from "@/lib/api";
import { ar } from "@/lib/i18n";
import { BrainCircuit, CheckCircle2, FileSearch, Loader2, Sparkles, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  document_id?: string;
  duplicate?: boolean;
  reextracted?: boolean;
  message?: string | null;
  extracted_count?: number;
  existing_count?: number;
  linked_count?: number;
  extracted_capabilities?: Array<{
    ontology_match?: boolean;
    ontology_match_type?: string;
    extraction_type?: string;
  }>;
};

const extractionSteps = [
  "جاري قراءة الوثيقة...",
  "جاري تحليل النص...",
  "جاري مطابقة القدرات مع المكتبة...",
  "جاري إنشاء القدرات...",
  "تم الانتهاء من الاستخراج",
];

type ExtractionState = "idle" | "extracting" | "success" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string>(ar.upload.ready);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ExtractionState>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!loading) return;
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, extractionSteps.length - 2));
    }, 1300);
    return () => window.clearInterval(timer);
  }, [loading]);

  const progress = useMemo(() => {
    if (status === "success") return 100;
    if (status === "error") return Math.max(18, stepIndex * 22);
    if (loading) return Math.min(88, 16 + stepIndex * 22);
    return 0;
  }, [loading, status, stepIndex]);

  const summary = useMemo(() => {
    const capabilities = lastResult?.extracted_capabilities ?? [];
    const total = Number(lastResult?.linked_count ?? lastResult?.extracted_count ?? capabilities.length ?? 0);
    const matched = capabilities.filter((item) => item.ontology_match || item.ontology_match_type === "matched" || item.extraction_type === "ontology_match").length;
    const proposed = capabilities.length ? Math.max(capabilities.length - matched, 0) : Math.max(total - matched, 0);
    return { total, matched, proposed };
  }, [lastResult]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || loading) return;
    await uploadSelectedFile(false);
  }

  async function uploadSelectedFile(forceReextract: boolean) {
    if (!selectedFile || loading) return;
    const form = new FormData();
    form.set("file", selectedFile);
    setStatus("extracting");
    setStepIndex(0);
    setErrorMessage("");
    setMessage("يتم الآن تحليل الوثيقة واستخراج القدرات المؤسسية...");
    setLoading(true);
    try {
      const suffix = forceReextract ? "?force_reextract=true" : "";
      const response = await fetch(`${API_BASE}/api/documents/upload${suffix}`, { method: "POST", body: form });
      if (!response.ok) throw new Error("upload failed");
      const data = await response.json();
      setLastResult(data);
      setStepIndex(extractionSteps.length - 1);
      setStatus("success");
      if (data.document_id) {
        localStorage.setItem("latest_document_id", data.document_id);
        localStorage.setItem("review_scope", "latest");
      }
      const count = Number(data.linked_count ?? data.extracted_count ?? 0);
      if (data.duplicate && Number(data.linked_count ?? data.existing_count ?? 0) === 0 && !data.reextracted) {
        setMessage("تم العثور على الوثيقة ولكن لا توجد قدرات مستخرجة لها. هل تريد إعادة الاستخراج؟");
      } else if (data.duplicate) {
        setMessage(data.message ?? "تم رفع هذه الوثيقة مسبقاً، تم عرض القدرات المستخرجة سابقاً.");
      } else {
        setMessage(`تم استخراج ${count} قدرة مؤسسية بنجاح`);
      }
    } catch {
      setStatus("error");
      setErrorMessage("تعذر استخراج القدرات من الوثيقة");
      setMessage("يرجى التحقق من محتوى الملف أو إعادة المحاولة");
    } finally {
      setLoading(false);
    }
  }

  function openLinkedCapabilities() {
    if (!lastResult?.document_id) return;
    localStorage.setItem("latest_document_id", lastResult.document_id);
    localStorage.setItem("review_scope", "latest");
    router.push(`/review?document_id=${lastResult.document_id}`);
  }

  return (
    <Shell>
      <Panel title={ar.upload.title}>
        <form onSubmit={onSubmit} className="grid gap-4">
          <label className={`group flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-teal/35 bg-gradient-to-br from-white to-teal/5 p-8 text-center transition duration-200 ${loading ? "cursor-wait opacity-80" : "cursor-pointer hover:border-teal hover:shadow-executive"}`}>
            <span className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-teal/10 text-teal transition group-hover:scale-105">
              {loading ? <BrainCircuit className="animate-pulse" size={28} /> : <Upload size={28} />}
            </span>
            <span className="text-lg font-bold">{ar.upload.chooseFile}</span>
            <span className="mt-2 text-sm text-slate-500">{selectedFile ? selectedFile.name : ar.upload.fileTypes}</span>
            <input
              name="file"
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              required
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setLastResult(null);
                setStatus("idle");
                setStepIndex(0);
                setErrorMessage("");
                setMessage(ar.upload.ready);
              }}
              disabled={loading}
            />
          </label>
          <button disabled={loading || !selectedFile} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-gradient-to-l from-teal to-emeraldDeep px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-executive disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={16} /> : status === "success" ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
            {loading ? "جاري استخراج القدرات..." : status === "success" ? "تم استخراج القدرات بنجاح" : ar.upload.mine}
          </button>
        </form>
        <ExtractionProgress status={status} stepIndex={stepIndex} progress={progress} message={message} errorMessage={errorMessage} />
        {status === "success" && lastResult ? <SuccessSummary total={summary.total} matched={summary.matched} proposed={summary.proposed} /> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/review" className="inline-flex rounded-2xl bg-teal px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5">مراجعة أحدث النتائج</Link>
          {lastResult?.duplicate && Number(lastResult.linked_count ?? lastResult.existing_count ?? 0) > 0 ? (
            <button onClick={openLinkedCapabilities} className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5">
              عرض القدرات المرتبطة بهذه الوثيقة
            </button>
          ) : null}
          {lastResult?.duplicate && Number(lastResult.linked_count ?? lastResult.existing_count ?? 0) === 0 ? (
            <button onClick={() => uploadSelectedFile(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-5 py-3 text-sm font-bold text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" size={15} /> : null}
              إعادة الاستخراج
            </button>
          ) : null}
        </div>
      </Panel>
      {loading ? <ExtractionOverlay stepIndex={stepIndex} progress={progress} /> : null}
    </Shell>
  );
}

function ExtractionProgress({ status, stepIndex, progress, message, errorMessage }: { status: ExtractionState; stepIndex: number; progress: number; message: string; errorMessage: string }) {
  const isActive = status === "extracting";
  const isSuccess = status === "success";
  const isError = status === "error";
  return (
    <section className={`mt-5 rounded-[26px] border px-4 py-4 ${isError ? "border-rose-200 bg-rose-50" : isSuccess ? "border-teal/20 bg-teal/5" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-2xl ${isError ? "bg-rose-100 text-rose-700" : "bg-teal/10 text-teal"}`}>
            {isError ? <XCircle size={20} /> : isSuccess ? <CheckCircle2 size={20} /> : <FileSearch className={isActive ? "animate-pulse" : ""} size={20} />}
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">{isError ? errorMessage : message}</p>
            <p className="mt-1 text-[13px] font-semibold text-slate-500">{isError ? "يرجى التحقق من محتوى الملف أو إعادة المحاولة" : extractionSteps[stepIndex]}</p>
          </div>
        </div>
        <span className="text-sm font-black text-teal ltr">{progress}%</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        <div className="h-full rounded-full bg-gradient-to-l from-teal via-emerald-500 to-emeraldDeep transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {extractionSteps.map((step, index) => (
          <div key={step} className={`rounded-2xl px-3 py-2 text-center text-[13px] font-bold transition ${index <= stepIndex ? "bg-white text-teal shadow-sm" : "bg-white/50 text-slate-400"}`}>
            {step}
          </div>
        ))}
      </div>
    </section>
  );
}

function SuccessSummary({ total, matched, proposed }: { total: number; matched: number; proposed: number }) {
  return (
    <section className="mt-4 grid gap-3 md:grid-cols-3">
      <SummaryMetric label="القدرات المستخرجة" value={total} />
      <SummaryMetric label="مطابقة للمكتبة" value={matched} />
      <SummaryMetric label="قدرات مقترحة" value={proposed} />
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-teal/10 bg-white px-4 py-3 text-center shadow-sm">
      <p className="text-3xl font-black text-ink ltr">{value}</p>
      <p className="mt-1 text-[13px] font-bold text-slate-500">{label}</p>
    </div>
  );
}

function ExtractionOverlay({ stepIndex, progress }: { stepIndex: number; progress: number }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/20 p-4 backdrop-blur-[2px]">
      <section className="w-full max-w-xl rounded-[30px] border border-white/80 bg-white/95 p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-teal/10 text-teal">
          <Loader2 className="animate-spin" size={28} />
        </div>
        <h2 className="mt-4 text-[24px] font-black text-ink">يتم الآن تحليل الوثيقة واستخراج القدرات المؤسسية...</h2>
        <p className="mt-2 text-[15px] font-semibold leading-7 text-slate-600">{extractionSteps[stepIndex]}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-l from-teal to-emeraldDeep transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 flex justify-center gap-1.5">
          {[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 animate-pulse rounded-full bg-teal" style={{ animationDelay: `${dot * 180}ms` }} />)}
        </div>
      </section>
    </div>
  );
}
