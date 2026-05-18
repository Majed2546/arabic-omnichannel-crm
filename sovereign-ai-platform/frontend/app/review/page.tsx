"use client";

import { Shell } from "@/components/Shell";
import { API_BASE } from "@/lib/api";
import { ar, localizeValue } from "@/lib/i18n";
import {
  Check,
  CheckCircle2,
  FileText,
  GitMerge,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Candidate = {
  id: string;
  document_id: string;
  document_title?: string | null;
  document_display_name?: string | null;
  name?: string | null;
  standardized_name: string;
  domain: string;
  area: string;
  evidence_quote: string;
  status: string;
  already_exists?: boolean;
  published_capability_id?: string | null;
  ontology_match?: boolean;
  ontology_match_type?: string;
  capability_type?: string | null;
  description?: string | null;
  keywords?: string[];
  reviewer_notes?: string | null;
  original_name?: string | null;
  original_standardized_name?: string | null;
  original_domain?: string | null;
  original_area?: string | null;
  suggested_arabic_name?: string | null;
  suggested_english_name?: string | null;
};

type SourceDocument = {
  id: string;
  title: string;
  display_name?: string;
  created_at?: string;
};

type Scope = "pending" | "latest" | "document" | "approved" | "rejected";

const activeStatuses = new Set(["pending", "in_review", "edited"]);
const domainOptions = ["Human Resources", "Procurement", "Finance", "Information Technology", "Media and Communications", "Strategy and Planning", "Legal and Compliance", "Operations", "Asset Management", "Supply Chain", "Maintenance"];
const ontologyOptions = [
  { value: "matched", label: "مطابقة للمكتبة" },
  { value: "new", label: "قدرة جديدة" },
  { value: "needs_review", label: "تحتاج مراجعة" },
];

export default function ReviewPage() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [scope, setScope] = useState<Scope>("pending");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [notice, setNotice] = useState("");

  async function load(nextScope = scope, nextDocumentId = selectedDocumentId) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextScope === "pending") params.set("status", "pending");
    if (nextScope === "latest") params.set("latest", "true");
    if (nextScope === "document" && nextDocumentId) params.set("document_id", nextDocumentId);
    if (nextScope === "approved") params.set("status", "approved");
    if (nextScope === "rejected") params.set("status", "rejected");

    const response = await fetch(`${API_BASE}/api/capabilities/extracted?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    setItems(dedupeCandidates(data));
    setSelectedIds((current) => new Set([...current].filter((id) => data.some((item: Candidate) => item.id === id))));
    setLoading(false);
  }

  async function loadDocuments() {
    const response = await fetch(`${API_BASE}/api/documents`, { cache: "no-store" });
    const data = await response.json();
    setDocuments(data.map((doc: SourceDocument) => ({ id: doc.id, title: doc.title, display_name: doc.display_name, created_at: doc.created_at })));
  }

  async function action(id: string, actionName: "approve" | "reject") {
    await fetch(`${API_BASE}/api/capabilities/extracted/${id}/${actionName}`, { method: "POST" });
    await load();
  }

  async function bulk(actionName: "approve" | "reject", ids: string[]) {
    for (const id of ids) {
      await fetch(`${API_BASE}/api/capabilities/extracted/${id}/${actionName}`, { method: "POST" });
    }
    await load();
  }

  async function saveDraft(id: string, payload: Partial<Candidate> & { keywords_text?: string }) {
    const keywords = payload.keywords_text?.split(/[,\n،]/).map((value) => value.trim()).filter(Boolean);
    const body = {
      name: payload.name,
      standardized_name: payload.standardized_name,
      domain: payload.domain,
      area: payload.area,
      capability: payload.standardized_name,
      capability_type: payload.capability_type,
      description: payload.description,
      ontology_match_type: payload.ontology_match_type,
      reviewer_notes: payload.reviewer_notes,
      keywords,
    };
    const response = await fetch(`${API_BASE}/api/capabilities/extracted/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const updated = await response.json();
    setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    setEditing(null);
    setNotice("تم تحديث القدرة بنجاح");
    await load();
  }

  async function mergeInto(itemId: string, capabilityId: string) {
    await fetch(`${API_BASE}/api/capabilities/extracted/${itemId}/merge-into/${capabilityId}`, { method: "POST" });
    setEditing(null);
    await load();
  }

  function changeScope(nextScope: Scope) {
    if (nextScope === "document") {
      const documentId = selectedDocumentId || documents[0]?.id || "";
      setSelectedDocumentId(documentId);
      setScope(documentId ? "document" : "pending");
      void load(documentId ? "document" : "pending", documentId);
      return;
    }
    setScope(nextScope);
    localStorage.setItem("review_scope", nextScope);
    void load(nextScope);
  }

  function changeDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    setScope("document");
    localStorage.setItem("latest_document_id", documentId);
    localStorage.setItem("review_scope", "document");
    void load("document", documentId);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    void loadDocuments();
    const queryDocumentId = new URLSearchParams(window.location.search).get("document_id");
    if (queryDocumentId) {
      setSelectedDocumentId(queryDocumentId);
      setScope("document");
      void load("document", queryDocumentId);
      return;
    }
    const storedDocumentId = localStorage.getItem("latest_document_id") ?? "";
    setSelectedDocumentId(storedDocumentId);
    setScope("pending");
    void load("pending", storedDocumentId);
  }, []);

  const activeItems = items.filter((item) => activeStatuses.has(item.status) && !item.already_exists);
  const selectedActive = activeItems.filter((item) => selectedIds.has(item.id));
  const grouped = useMemo(() => groupByDocument(items, documents), [items, documents]);

  return (
    <Shell>
      <main className="space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.10),transparent_28rem),linear-gradient(135deg,#ffffff_0%,#f8fbfb_100%)] p-6 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal"><Sparkles size={16} />قائمة مراجعة مستمرة</p>
              <h1 className="mt-2 text-3xl font-black text-ink">مراجعة القدرات المستخرجة</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">تبقى القدرات المعلقة في قائمة المراجعة حتى يتم اعتمادها أو رفضها أو دمجها، حتى بعد رفع وثائق جديدة.</p>
            </div>
            <button onClick={() => load()} className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal hover:text-teal" title={ar.review.refresh}><RefreshCw size={17} /></button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterButton active={scope === "pending"} label="جميع القدرات المعلقة" onClick={() => changeScope("pending")} />
            <FilterButton active={scope === "latest"} label="آخر وثيقة فقط" onClick={() => changeScope("latest")} />
            <FilterButton active={scope === "document"} label="حسب الوثيقة" onClick={() => changeScope("document")} />
            <FilterButton active={scope === "approved"} label="المعتمدة" onClick={() => changeScope("approved")} />
            <FilterButton active={scope === "rejected"} label="المرفوضة" onClick={() => changeScope("rejected")} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(17rem,24rem)_1fr]">
            <select
              value={selectedDocumentId}
              onChange={(event) => changeDocument(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-700 shadow-sm outline-none transition focus:border-teal"
            >
              <option value="">اختر وثيقة للمراجعة</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>{cleanDocumentTitle(doc.display_name || doc.title)}</option>
              ))}
            </select>
            <WorkflowStats items={items} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <BulkButton icon={CheckCircle2} label="اعتماد الكل / Approve All" onClick={() => bulk("approve", activeItems.map((item) => item.id))} disabled={!activeItems.length} tone="green" />
            <BulkButton icon={XCircle} label="رفض الكل / Reject All" onClick={() => bulk("reject", activeItems.map((item) => item.id))} disabled={!activeItems.length} tone="red" />
            <BulkButton icon={Check} label="اعتماد المحدد / Approve Selected" onClick={() => bulk("approve", selectedActive.map((item) => item.id))} disabled={!selectedActive.length} tone="teal" />
          </div>
          {notice ? <p className="mt-4 rounded-2xl bg-teal/10 px-4 py-3 text-[15px] font-bold text-teal">{notice}</p> : null}
        </section>

        {loading ? <div className="rounded-[26px] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">جار تحميل قائمة المراجعة...</div> : null}

        <section className="space-y-5">
          {grouped.map((group) => (
            <DocumentGroup
              key={group.documentId}
              group={group}
              selectedIds={selectedIds}
              onSelect={toggleSelected}
              onApprove={(id) => action(id, "approve")}
              onReject={(id) => action(id, "reject")}
              onEdit={(item) => setEditing(item)}
            />
          ))}
          {!loading && items.length === 0 ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد قدرات ضمن نطاق المراجعة المحدد.</div> : null}
        </section>
        {editing ? <EditCapabilityModal item={editing} onClose={() => setEditing(null)} onSave={saveDraft} onMerge={mergeInto} /> : null}
      </main>
    </Shell>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? "bg-teal text-white shadow-soft" : "bg-white/80 text-slate-700 shadow-sm hover:bg-white"}`}>{label}</button>;
}

function DocumentGroup({
  group,
  selectedIds,
  onSelect,
  onApprove,
  onReject,
  onEdit,
}: {
  group: { documentId: string; title: string; createdAt?: string; items: Candidate[] };
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (item: Candidate) => void;
}) {
  const active = group.items.filter((item) => activeStatuses.has(item.status)).length;
  return (
    <section className="rounded-[30px] border border-slate-200/70 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal"><FileText size={20} /></span>
          <div>
            <h2 className="text-[24px] font-semibold leading-[1.5] text-ink">{group.title}</h2>
            <p className="mt-1 text-[15px] font-semibold leading-7 text-slate-600">{group.items.length} قدرة · {active} بانتظار المراجعة {group.createdAt ? `· ${formatDate(group.createdAt)}` : ""}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {group.items.map((item) => (
          <CapabilityCandidateCard
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            onSelect={() => onSelect(item.id)}
            onApprove={() => onApprove(item.id)}
            onReject={() => onReject(item.id)}
            onEdit={() => onEdit(item)}
          />
        ))}
      </div>
    </section>
  );
}

function CapabilityCandidateCard({
  item,
  selected,
  onSelect,
  onApprove,
  onReject,
  onEdit,
}: {
  item: Candidate;
  selected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  const arabicName = item.name || capabilityArabic(item.standardized_name);
  const englishName = item.standardized_name;
  const originalName = item.original_name && item.original_name !== arabicName ? item.original_name : "";
  const alreadyExists = Boolean(item.already_exists);
  const actionable = activeStatuses.has(item.status) && !alreadyExists;
  return (
    <article className="group rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.055)] ring-1 ring-slate-100/70 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={(event) => {
            event.stopPropagation();
            if (actionable) onSelect();
          }}
          className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${selected ? "border-teal bg-teal text-white" : actionable ? "border-slate-300 bg-white text-transparent" : "border-slate-200 bg-slate-50 text-transparent"}`}
          title="تحديد"
        >
          <Check size={12} />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[20px] font-semibold leading-9 text-ink">{arabicName}</h3>
          <p className="mt-1 truncate text-[15px] font-medium leading-6 text-slate-600 ltr" dir="ltr">{englishName}</p>
          <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-600">{domainArabic(item.domain)} · <span className="ltr">{domainEnglish(item.domain)}</span></p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={item.status} alreadyExists={alreadyExists} />
          <OntologyBadge matched={Boolean(item.ontology_match)} />
        </div>
      </div>

      {originalName ? <p className="mt-4 line-clamp-2 rounded-2xl bg-slate-50 px-3 py-2 text-[14px] font-semibold leading-7 text-slate-500">الأصل: {originalName}</p> : null}
      <p className="mt-3 line-clamp-2 text-[15px] leading-7 text-slate-700">{capabilityRuleSummary(item)}</p>

      {actionable ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={(event) => { event.stopPropagation(); onEdit(); }} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-[14px] font-bold text-slate-700 transition hover:bg-slate-900 hover:text-white" title="تعديل">
            <Pencil size={13} /> تعديل / Edit
          </button>
          <button onClick={(event) => { event.stopPropagation(); onApprove(); }} className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-3.5 py-2 text-[14px] font-bold text-teal transition hover:bg-teal hover:text-white" title="اعتماد">
            <Check size={13} /> اعتماد / Approve
          </button>
          <button onClick={(event) => { event.stopPropagation(); onReject(); }} className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-2 text-[14px] font-bold text-rose-700 transition hover:bg-rose hover:text-white" title="رفض">
            <X size={13} /> رفض / Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}

function EditCapabilityModal({
  item,
  onClose,
  onSave,
  onMerge,
}: {
  item: Candidate;
  onClose: () => void;
  onSave: (id: string, payload: Partial<Candidate> & { keywords_text?: string }) => void;
  onMerge: (itemId: string, capabilityId: string) => void;
}) {
  const [draft, setDraft] = useState({
    name: item.name || capabilityArabic(item.standardized_name),
    standardized_name: item.standardized_name,
    domain: item.domain,
    area: item.area,
    capability_type: item.capability_type || "Capability",
    description: item.description || "",
    keywords_text: (item.keywords || []).join("، "),
    ontology_match_type: item.ontology_match_type || (item.ontology_match ? "matched" : "new"),
    reviewer_notes: item.reviewer_notes || "",
  });
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; domain: string; area: string; score: number }>>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/capabilities/extracted/${item.id}/suggestions`, { cache: "no-store" })
      .then((response) => response.json())
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [item.id]);

  function update(key: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[14px] font-bold text-teal">تنقيح القدرة قبل الاعتماد</p>
            <h2 className="mt-1 text-[28px] font-bold leading-[1.4] text-ink">{draft.name}</h2>
            <p className="mt-1 text-[15px] font-semibold text-slate-600 ltr" dir="ltr">{draft.standardized_name}</p>
          </div>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-900 hover:text-white"><X size={18} /></button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="اسم القدرة بالعربية">
              <input value={draft.name} onChange={(event) => update("name", event.target.value)} className="input-curation" />
            </FormField>
            <FormField label="English Capability Name">
              <input dir="ltr" value={draft.standardized_name} onChange={(event) => update("standardized_name", event.target.value)} className="input-curation ltr" />
            </FormField>
            <FormField label="المجال المؤسسي">
              <select value={draft.domain} onChange={(event) => update("domain", event.target.value)} className="input-curation">
                {domainOptions.map((domain) => <option key={domain} value={domain}>{domainArabic(domain)} · {domainEnglish(domain)}</option>)}
              </select>
            </FormField>
            <FormField label="منطقة القدرة">
              <input value={draft.area} onChange={(event) => update("area", event.target.value)} className="input-curation" />
            </FormField>
            <FormField label="نوع القدرة">
              <select value={draft.capability_type} onChange={(event) => update("capability_type", event.target.value)} className="input-curation">
                <option value="Capability">Capability</option>
                <option value="Business Service">Business Service</option>
                <option value="Function">Function</option>
                <option value="Process Capability">Process Capability</option>
              </select>
            </FormField>
            <FormField label="نوع مطابقة الأنطولوجيا">
              <select value={draft.ontology_match_type} onChange={(event) => update("ontology_match_type", event.target.value)} className="input-curation">
                {ontologyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FormField>
            <FormField label="الكلمات المفتاحية">
              <input value={draft.keywords_text} onChange={(event) => update("keywords_text", event.target.value)} placeholder="مثال: تخطيط، موارد بشرية، سياسات" className="input-curation" />
            </FormField>
            <FormField label="ملاحظات المراجع">
              <input value={draft.reviewer_notes} onChange={(event) => update("reviewer_notes", event.target.value)} className="input-curation" />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="وصف القدرة">
              <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={4} className="input-curation resize-none" />
            </FormField>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] bg-slate-50 p-4">
              <h3 className="text-[18px] font-bold text-ink">الناتج الأصلي المحفوظ</h3>
              <div className="mt-3 space-y-2 text-[14px] font-semibold leading-7 text-slate-600">
                <p>{item.original_name || item.name || capabilityArabic(item.standardized_name)}</p>
                <p dir="ltr" className="ltr">{item.original_standardized_name || item.standardized_name}</p>
                <p>{domainArabic(item.original_domain || item.domain)} · {item.original_area || item.area}</p>
              </div>
            </div>
            <div className="rounded-[24px] bg-amber-50/70 p-4">
              <h3 className="text-[18px] font-bold text-ink">اقتراحات التسمية والدمج</h3>
              <div className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-[15px] font-bold text-ink">{item.suggested_arabic_name || item.name || capabilityArabic(item.standardized_name)}</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-600 ltr" dir="ltr">{item.suggested_english_name || item.standardized_name}</p>
              </div>
              <div className="mt-3 space-y-2">
                {suggestions.length ? suggestions.map((suggestion) => (
                  <button key={suggestion.id} onClick={() => onMerge(item.id, suggestion.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-start shadow-sm transition hover:-translate-y-0.5">
                    <span>
                      <span className="block text-[15px] font-bold text-ink">{capabilityArabic(suggestion.name)}</span>
                      <span className="block text-[13px] font-semibold text-slate-600">{domainArabic(suggestion.domain)} · {suggestion.area}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[13px] font-bold text-slate-700"><GitMerge size={13} /> دمج</span>
                  </button>
                )) : <p className="text-[14px] font-semibold text-slate-600">لا توجد اقتراحات تشابه عالية حالياً.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 p-5">
          <button onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 text-[15px] font-bold text-slate-700 transition hover:bg-slate-200">إلغاء</button>
          <button onClick={() => onSave(item.id, draft)} className="inline-flex items-center gap-2 rounded-2xl bg-teal px-5 py-3 text-[15px] font-bold text-white shadow-soft transition hover:-translate-y-0.5">
            <Save size={16} /> حفظ كمسودة
          </button>
        </div>
      </section>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function WorkflowStats({ items }: { items: Candidate[] }) {
  const stats = [
    { label: "الإجمالي / Total", value: items.length, className: "bg-slate-50 text-slate-700" },
    { label: "معلقة / Pending", value: items.filter((item) => activeStatuses.has(item.status)).length, className: "bg-amber-50 text-amber-700" },
    { label: "معتمدة / Approved", value: items.filter((item) => item.status === "approved").length, className: "bg-teal/10 text-teal" },
    { label: "مرفوضة / Rejected", value: items.filter((item) => item.status === "rejected").length, className: "bg-rose-50 text-rose-700" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className={`rounded-2xl px-4 py-2.5 text-center text-[14px] font-bold leading-6 ${stat.className}`}>
          <span className="block text-lg ltr">{stat.value}</span>
          {stat.label}
        </div>
      ))}
    </div>
  );
}

function BulkButton({ icon: Icon, label, onClick, disabled, tone }: { icon: LucideIcon; label: string; onClick: () => void; disabled: boolean; tone: "green" | "red" | "teal" }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    red: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    teal: "bg-teal/10 text-teal hover:bg-teal/15",
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles}`}>
      <Icon size={16} />
      {label}
    </button>
  );
}

function StatusBadge({ status, alreadyExists }: { status: string; alreadyExists?: boolean }) {
  if (alreadyExists) return <span className="shrink-0 rounded-full bg-slate-50 px-3 py-1.5 text-[13px] font-bold leading-6 text-slate-600">موجودة مسبقاً</span>;
  const className = status === "approved" ? "bg-teal/10 text-teal" : status === "rejected" ? "bg-rose-50 text-rose-700" : status === "merged" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700";
  const labels: Record<string, string> = {
    pending: "بانتظار المراجعة / Pending",
    in_review: "قيد المراجعة / In Review",
    edited: "معدلة / Edited",
    approved: "معتمد / Approved",
    rejected: "مرفوض / Rejected",
    merged: "مدمجة / Merged",
  };
  return <span className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold leading-6 ${className}`}>{labels[status] ?? status}</span>;
}

function OntologyBadge({ matched }: { matched: boolean }) {
  return matched ? (
    <span className="rounded-full bg-teal/10 px-3 py-1.5 text-[13px] font-bold leading-6 text-teal">مطابقة للمكتبة</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-bold leading-6 text-slate-700">قدرة مقترحة</span>
  );
}

function capabilityRuleSummary(item: Candidate) {
  return `اسم قدرة مؤسسية دائم ضمن ${domainArabic(item.domain)} وليس جملة مسؤولية تشغيلية.`;
}

function groupByDocument(items: Candidate[], documents: SourceDocument[]) {
  const docMap = new Map(documents.map((doc) => [doc.id, doc]));
  const groups = new Map<string, { documentId: string; title: string; createdAt?: string; items: Candidate[] }>();
  for (const item of items) {
    const document = docMap.get(item.document_id);
    const title = cleanDocumentTitle(item.document_display_name || document?.display_name || item.document_title || document?.title);
    const group = groups.get(item.document_id) ?? { documentId: item.document_id, title, createdAt: document?.created_at, items: [] };
    group.items.push(item);
    groups.set(item.document_id, group);
  }
  return Array.from(groups.values()).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

function cleanDocumentTitle(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "قدرات بحاجة إلى تصنيف";
  const withoutExt = raw.replace(/\.[^.]+$/, "");
  const cleaned = withoutExt
    .replace(/^[0-9a-fA-F-]{8,}[_\-\s]*/, "")
    .replace(/^\d+[_\-\s]*/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^(tmp|temp|upload)/i.test(cleaned)) return "قدرات بحاجة إلى تصنيف";
  return cleaned;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
}

const capabilityTranslations: Record<string, string> = {
  "HR Policy Management": "إدارة سياسات الموارد البشرية",
  "Workforce Planning": "تخطيط القوى العاملة",
  "Employee Services Management": "إدارة خدمات الموظفين",
  "Training Management": "إدارة التدريب",
  "Complaints and Grievances Management": "إدارة الشكاوى والتظلمات",
  "HR Digital Transformation Support": "دعم التطبيقات الرقمية للموارد البشرية",
  "Corporate Communications Management": "إدارة الاتصال المؤسسي",
  "Media Content Management": "إدارة المحتوى الإعلامي",
  "Media Monitoring and Analysis": "رصد وتحليل الإعلام",
  "Strategic Planning Management": "إدارة التخطيط الاستراتيجي",
  "Performance Management": "إدارة قياس الأداء",
  "Compliance Management": "إدارة الالتزام",
  "Legal Advisory Management": "إدارة الاستشارات القانونية",
  "Service Operations Management": "إدارة تشغيل الخدمات",
  "Asset Management": "إدارة الأصول",
  "Inventory Management": "إدارة المخزون",
  "Maintenance Management": "إدارة الصيانة",
  "Strategic Sourcing": "إدارة التوريد الاستراتيجي",
  "Supplier Performance Management": "إدارة أداء الموردين",
  "Vendor Registration": "إدارة تسجيل الموردين",
  "Purchase Requisition Management": "إدارة طلبات الشراء",
  "Purchase Order Management": "إدارة أوامر الشراء",
  "Contract Lifecycle Management": "إدارة دورة حياة العقود",
  "Budget Control": "ضبط الميزانية",
  "Invoice Matching": "مطابقة الفواتير",
  "Spend Analytics": "تحليل الإنفاق",
  "ERP Management": "إدارة أنظمة تخطيط الموارد",
  "Integration Management": "إدارة التكامل",
  "Identity Access Management": "إدارة الهوية والصلاحيات",
};

const domainTranslations: Record<string, string> = {
  "Human Resources": "الموارد البشرية",
  Procurement: "المشتريات",
  Finance: "المالية",
  "Information Technology": "تقنية المعلومات",
  "Media and Communications": "الإعلام والاتصال",
  "Strategy and Planning": "التخطيط والاستراتيجية",
  "Legal and Compliance": "القانونية والالتزام",
  Operations: "العمليات",
  "Asset Management": "إدارة الأصول",
  "Supply Chain": "سلاسل الإمداد",
  Maintenance: "الصيانة",
  IT: "تقنية المعلومات",
  "Enterprise Management": "قدرات الأعمال",
};

function capabilityArabic(name: string) {
  return capabilityTranslations[name] ?? localizeValue(name);
}

function domainArabic(domain: string) {
  return domainTranslations[domain] ?? localizeValue(domain);
}

function domainEnglish(domain: string) {
  return domain === "IT" ? "Information Technology" : domain;
}

function dedupeCandidates(items: Candidate[]) {
  const map = new Map<string, Candidate>();
  for (const item of items) {
    const key = normalizedKey(item.document_id, item.standardized_name, item.domain, item.area);
    const current = map.get(key);
    if (!current || candidateRank(item) > candidateRank(current)) map.set(key, item);
  }
  return Array.from(map.values());
}

function candidateRank(item: Candidate) {
  if (activeStatuses.has(item.status)) return 4;
  if (item.already_exists) return 3;
  if (item.status === "approved") return 2;
  return 1;
}

function normalizedKey(...values: string[]) {
  return values.map((value) => value.trim().toLowerCase().replace(/\s+/g, " ")).join("|");
}
