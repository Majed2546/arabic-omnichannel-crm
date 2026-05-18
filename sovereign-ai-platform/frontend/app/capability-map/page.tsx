"use client";

import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Layers3,
  Search,
  Server,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { API_BASE } from "@/lib/api";
import { localizeValue } from "@/lib/i18n";

type Capability = { id: string; name: string; standardized_name?: string; description?: string | null; sub_capability?: string; owner_unit_id?: string; domain: string; area: string };
type Domain = { name: string; areas: { name: string; capabilities: Omit<Capability, "domain" | "area">[] }[] };
type MapData = { domains: Domain[] };
type GraphNode = { id: string; label: string; name: string };
type GraphEdge = { id: string; source: string; target: string; relationship: string; source_type?: string; target_type?: string };
type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };
type Overlap = { id: string; source_id: string; source_name: string; target_id: string; target_name: string; score: number; overlap_type: string; recommendation: string; explanation: string };
type Related = { departments: GraphNode[]; systems: GraphNode[]; projects: GraphNode[]; overlaps: Overlap[] };

const domainLabels: Record<string, string> = {
  Finance: "المالية",
  Procurement: "المشتريات",
  IT: "تقنية المعلومات",
  "Information Technology": "تقنية المعلومات",
  HR: "الموارد البشرية",
  "Human Resources": "الموارد البشرية",
  Strategy: "التخطيط والاستراتيجية",
  "Strategy and Planning": "التخطيط والاستراتيجية",
  "Media and Communications": "الإعلام والاتصال",
  "Legal and Compliance": "القانونية والالتزام",
  Operations: "العمليات",
  "Asset Management": "إدارة الأصول",
  "Supply Chain": "سلاسل الإمداد",
  Maintenance: "الصيانة",
  "Enterprise Management": "قدرات الأعمال",
};

const domainAccent: Record<string, string> = {
  Finance: "border-t-amber-400",
  Procurement: "border-t-teal",
  IT: "border-t-blue-500",
  "Information Technology": "border-t-blue-500",
  HR: "border-t-rose-400",
  "Human Resources": "border-t-rose-400",
  Strategy: "border-t-violet-500",
  "Strategy and Planning": "border-t-violet-500",
  "Media and Communications": "border-t-sky-500",
  "Legal and Compliance": "border-t-slate-500",
  Operations: "border-t-emerald-500",
  "Enterprise Management": "border-t-slate-400",
};

const fallbackDomains = ["Human Resources", "Procurement", "Finance", "Information Technology", "Media and Communications", "Strategy and Planning"];

export default function CapabilityMapPage() {
  const [data, setData] = useState<MapData>({ domains: [] });
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  useEffect(() => {
    fetch(`${API_BASE}/api/capabilities/map`, { cache: "no-store" })
      .then((response) => response.json())
      .then(setData)
      .catch(() => setData({ domains: [] }));
    fetch(`${API_BASE}/api/graph`, { cache: "no-store" })
      .then((response) => response.json())
      .then(setGraph)
      .catch(() => setGraph({ nodes: [], edges: [] }));
    fetch(`${API_BASE}/api/overlaps`, { cache: "no-store" })
      .then((response) => response.json())
      .then(setOverlaps)
      .catch(() => setOverlaps([]));
  }, []);

  const capabilities = useMemo(() => flattenCapabilities(data), [data]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const relatedByCapability = useMemo(() => {
    const result = new Map<string, Related>();
    for (const capability of capabilities) {
      result.set(capability.id, buildRelated(capability, graph, nodeById, overlaps));
    }
    return result;
  }, [capabilities, graph, nodeById, overlaps]);

  const selected = capabilities.find((capability) => capability.id === selectedId) ?? null;
  const selectedRelated = selected ? relatedByCapability.get(selected.id) ?? emptyRelated(selected) : null;
  const domains = Array.from(new Set([...fallbackDomains, ...capabilities.map((item) => item.domain)]));
  const owners = Array.from(new Set(capabilities.map((item) => ownerName(item, nodeById)).filter(Boolean)));

  const filtered = capabilities.filter((capability) => {
    const related = relatedByCapability.get(capability.id) ?? emptyRelated(capability);
    const matchesQuery = `${capability.name} ${capability.domain} ${capability.area}`.toLowerCase().includes(query.toLowerCase());
    const matchesDomain = domainFilter === "all" || capability.domain === domainFilter;
    const matchesOwner = ownerFilter === "all" || ownerName(capability, nodeById) === ownerFilter || (ownerFilter === "none" && !capability.owner_unit_id);
    return matchesQuery && matchesDomain && matchesOwner;
  });

  const grouped = domains
    .map((domain) => ({ domain, capabilities: filtered.filter((capability) => capability.domain === domain) }))
    .filter((group) => group.capabilities.length > 0);

  const summary = {
    total: capabilities.length,
    noOwner: capabilities.filter((item) => !item.owner_unit_id).length,
    supported: capabilities.filter((item) => (relatedByCapability.get(item.id)?.systems.length ?? 0) > 0).length,
    overlaps: capabilities.filter((item) => (relatedByCapability.get(item.id)?.overlaps.length ?? 0) > 0).length,
  };

  return (
    <Shell>
      <main className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.10),transparent_28rem),linear-gradient(135deg,#ffffff_0%,#f8fbfb_100%)] p-6 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="mt-2 text-3xl font-black text-ink">خريطة القدرات</h1>
              <p className="mt-3 max-w-3xl text-[17px] leading-9 text-slate-700">استعراض القدرات وربطها بالأنظمة والإدارات والمشاريع والتداخلات.</p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <label className="relative block">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن قدرة..." className="h-14 w-full rounded-[22px] border border-slate-200 bg-white pr-12 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal focus:ring-4 focus:ring-teal/10" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <FilterSelect label="المجال" value={domainFilter} onChange={setDomainFilter} options={[["all", "كل المجالات"], ...domains.map((domain) => [domain, domainName(domain)] as [string, string])]} />
              <FilterSelect label="المالك" value={ownerFilter} onChange={setOwnerFilter} options={[["all", "كل الملاك"], ["none", "بدون مالك"], ...owners.map((owner) => [owner, owner] as [string, string])]} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard icon={Layers3} label="إجمالي القدرات" description="قدرات متاحة للعرض" value={summary.total} tone="teal" />
          <SummaryCard icon={AlertTriangle} label="قدرات بدون مالك" description="تحتاج تحديد جهة مسؤولة" value={summary.noOwner} tone="amber" />
          <SummaryCard icon={Server} label="قدرات مدعومة بأنظمة" description="لها تغطية تقنية مباشرة" value={summary.supported} tone="blue" />
          <SummaryCard icon={ShieldCheck} label="قدرات لها تداخلات" description="تحتاج قرار حوكمة" value={summary.overlaps} tone="rose" />
        </section>

        <section className="space-y-5">
          {grouped.map((group) => (
            <div key={group.domain} className="rounded-[30px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)]">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-[26px] font-semibold leading-[1.5] text-ink">{domainName(group.domain)}</h2>
                  <p className="mt-2 text-[15px] font-semibold leading-7 text-slate-600">{group.capabilities.length} قدرة منشورة في هذا المجال</p>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{localizeValue(group.domain)}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {group.capabilities.map((capability) => (
                  <CapabilityCard key={capability.id} capability={capability} related={relatedByCapability.get(capability.id) ?? emptyRelated(capability)} owner={ownerName(capability, nodeById)} onClick={() => setSelectedId(capability.id)} />
                ))}
              </div>
            </div>
          ))}
          {capabilities.length === 0 ? <EmptyState title="لا توجد قدرات منشورة بعد" description="ابدأ بمراجعة واعتماد القدرات المستخرجة حتى تظهر هنا." /> : null}
          {capabilities.length > 0 && grouped.length === 0 ? <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تعديل البحث أو الفلاتر الحالية." /> : null}
        </section>
      </main>

      {selected && selectedRelated ? (
        <CapabilityDrawer capability={selected} related={selectedRelated} owner={ownerName(selected, nodeById)} onClose={() => setSelectedId(null)} />
      ) : null}
    </Shell>
  );
}

function flattenCapabilities(data: MapData): Capability[] {
  const flattened = data.domains.flatMap((domain) =>
    domain.areas.flatMap((area) =>
      area.capabilities.map((capability) => ({
        ...capability,
        domain: domain.name,
        area: area.name,
      })),
    ),
  );
  const unique = new Map<string, Capability>();
  for (const capability of flattened) {
    const key = normalizedCapabilityKey(capability.name, capability.domain, capability.area);
    if (!unique.has(key)) {
      unique.set(key, capability);
    }
  }
  return Array.from(unique.values());
}

function buildRelated(capability: Capability, graph: GraphData, nodeById: Map<string, GraphNode>, overlaps: Overlap[]): Related {
  const directEdges = graph.edges.filter((edge) => edge.source === capability.id || edge.target === capability.id);
  const linkedNodeIds = directEdges.map((edge) => (edge.source === capability.id ? edge.target : edge.source));
  const systems = uniqueNodes([
    ...linkedNodeIds.map((id) => nodeById.get(id)).filter((node): node is GraphNode => node ? ["Application", "System"].includes(node.label) : false),
    ...graph.edges
      .filter((edge) => edge.target === capability.id && ["Application", "System"].includes(edge.source_type ?? ""))
      .map((edge) => nodeById.get(edge.source))
      .filter((node): node is GraphNode => node !== undefined),
  ]);
  const systemIds = new Set(systems.map((system) => system.id));
  const projects = uniqueNodes([
    ...linkedNodeIds.map((id) => nodeById.get(id)).filter((node): node is GraphNode => node ? node.label === "Project" : false),
    ...graph.edges
      .filter((edge) => systemIds.has(edge.target) || systemIds.has(edge.source))
      .map((edge) => nodeById.get(edge.source_type === "Project" ? edge.source : edge.target_type === "Project" ? edge.target : ""))
      .filter((node): node is GraphNode => node ? node.label === "Project" : false),
  ]);
  const departments = uniqueNodes([
    capability.owner_unit_id ? nodeById.get(capability.owner_unit_id) : undefined,
    ...linkedNodeIds.map((id) => nodeById.get(id)).filter((node): node is GraphNode => node ? ["OrganizationUnit", "Department"].includes(node.label) : false),
  ].filter((node): node is GraphNode => node !== undefined));
  const relatedOverlaps = overlaps.filter((item) => [item.source_id, item.target_id, item.source_name, item.target_name].includes(capability.id) || [item.source_name, item.target_name].includes(capability.name));
  return {
    departments,
    systems,
    projects,
    overlaps: relatedOverlaps,
  };
}

function uniqueNodes(nodes: GraphNode[]) {
  return Array.from(new Map(nodes.map((node) => [node.id, node])).values());
}

function emptyRelated(_capability: Capability): Related {
  return { departments: [], systems: [], projects: [], overlaps: [] };
}

function ownerName(capability: Capability, nodeById: Map<string, GraphNode>) {
  return capability.owner_unit_id ? nodeById.get(capability.owner_unit_id)?.name ?? "مالك محدد" : "";
}

function domainName(domain: string) {
  return domainLabels[domain] ?? localizeValue(domain);
}

function normalizedCapabilityKey(...values: string[]) {
  return values.map((value) => value.trim().toLowerCase().replace(/\s+/g, " ")).join("|");
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-14 w-full rounded-[22px] border border-slate-200 bg-white px-3 pt-4 text-xs font-semibold text-slate-700 shadow-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function SummaryCard({ icon: Icon, label, description, value, tone }: { icon: LucideIcon; label: string; description: string; value: number; tone: "teal" | "amber" | "blue" | "rose" }) {
  const classes = {
    teal: "from-teal/10 to-white text-teal",
    amber: "from-amber-100/70 to-white text-amber-700",
    blue: "from-blue-100/70 to-white text-blue-700",
    rose: "from-rose-100/70 to-white text-rose-700",
  }[tone];
  return (
    <div className={`rounded-[26px] border border-white bg-gradient-to-br ${classes} p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/70`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-800">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/80 shadow-sm"><Icon size={18} /></span>
      </div>
      <p className="mt-5 text-4xl font-black text-ink ltr">{value}</p>
    </div>
  );
}

function CapabilityCard({ capability, related, owner, onClick }: { capability: Capability; related: Related; owner: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`group rounded-[24px] border border-t-4 border-slate-100/80 ${domainAccent[capability.domain] ?? "border-t-slate-300"} bg-white p-4 text-right shadow-[0_14px_34px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/70 transition duration-200 hover:-translate-y-1 hover:ring-teal/15 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal/12 to-white text-teal ring-1 ring-teal/10"><Boxes size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[20px] font-semibold leading-8 text-ink">{capability.name}</span>
          {capability.standardized_name ? <span className="mt-1 block truncate text-[14px] font-semibold leading-6 text-slate-500 ltr" dir="ltr">{capability.standardized_name}</span> : null}
          <span className="mt-2 block text-[14px] font-semibold leading-6 text-slate-600">{domainName(capability.domain)} · {localizeValue(capability.area)}</span>
        </span>
      </div>
      <p className="mt-4 border-b border-slate-100 pb-4 text-[14px] font-semibold leading-7 text-slate-600">{owner || "بدون مالك محدد"}</p>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <MiniMetric label="أنظمة" value={related.systems.length} tone="blue" />
        <MiniMetric label="إدارات" value={related.departments.length} tone="teal" />
        <MiniMetric label="مشاريع" value={related.projects.length} tone="purple" />
        <MiniMetric label="تداخلات" value={related.overlaps.length} tone="rose" />
      </div>
      <p className="mt-4 text-[15px] font-bold leading-7 text-teal opacity-0 transition group-hover:opacity-100">عرض العلاقات</p>
    </button>
  );
}

function CapabilityDrawer({ capability, related, owner, onClose }: { capability: Capability; related: Related; owner: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm">
      <div className="absolute inset-y-0 left-0 flex w-full justify-start">
        <aside className="h-full w-full max-w-5xl overflow-y-auto border-r border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6 shadow-2xl">
          <div className="rounded-[30px] border border-white bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-teal">تفاصيل القدرة المؤسسية Capability</p>
              <h2 className="mt-2 text-3xl font-black leading-10 text-ink">{capability.name}</h2>
              {capability.standardized_name ? <p className="mt-2 text-sm font-semibold text-slate-500 ltr" dir="ltr">{capability.standardized_name}</p> : null}
              <p className="mt-2 text-sm text-slate-500">{domainName(capability.domain)} · {localizeValue(capability.area)} · {owner || "بدون مالك محدد"}</p>
            </div>
            <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:text-rose-600" title="إغلاق">
              <X size={20} />
            </button>
          </div>

          <p className="mt-5 text-[15px] font-semibold leading-7 text-slate-600">المالك: {owner || "غير محدد"}</p>
          </div>

          <RelationshipDiagram capability={capability} related={related} />

          <section className="mt-5 grid gap-4 lg:grid-cols-4">
            <RelationshipList title="الأنظمة الداعمة" icon={Server} items={related.systems} empty="لا توجد أنظمة مباشرة." />
            <RelationshipList title="الإدارات المرتبطة" icon={Building2} items={related.departments} empty="لا توجد إدارات مرتبطة." />
            <RelationshipList title="المشاريع المرتبطة" icon={ClipboardList} items={related.projects} empty="لا توجد مشاريع مرتبطة." />
            <OverlapList overlaps={related.overlaps} />
          </section>

        </aside>
      </div>
    </div>
  );
}

function RelationshipDiagram({ capability, related }: { capability: Capability; related: Related }) {
  return (
    <section className="relative mt-5 min-h-[300px] overflow-visible rounded-[30px] border border-slate-200/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.055)]" dir="ltr">
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="drawer-arrow-teal" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#0f766e" /></marker>
          <marker id="drawer-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" /></marker>
          <marker id="drawer-arrow-purple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#7c3aed" /></marker>
          <marker id="drawer-arrow-rose" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#e11d48" /></marker>
        </defs>
        <path d="M29 30 C37 30 40 41 46 46" stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" markerEnd="url(#drawer-arrow-purple)" opacity="0.82" vectorEffect="non-scaling-stroke" />
        <path d="M29 70 C37 70 40 59 46 54" stroke="#e11d48" strokeWidth="2.5" fill="none" strokeLinecap="round" markerEnd="url(#drawer-arrow-rose)" opacity="0.82" vectorEffect="non-scaling-stroke" />
        <path d="M71 30 C63 30 60 41 54 46" stroke="#0f766e" strokeWidth="2.5" fill="none" strokeLinecap="round" markerEnd="url(#drawer-arrow-teal)" opacity="0.82" vectorEffect="non-scaling-stroke" />
        <path d="M71 70 C63 70 60 59 54 54" stroke="#2563eb" strokeWidth="2.5" fill="none" strokeLinecap="round" markerEnd="url(#drawer-arrow-blue)" opacity="0.82" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative z-10 grid min-h-[260px] grid-cols-3 items-center gap-9">
        <div className="space-y-4">
          <DiagramGroup title="المشاريع المرتبطة" items={related.projects} type="Project" />
          <OverlapDiagramGroup overlaps={related.overlaps} />
        </div>
        <div className="mx-auto w-full max-w-[270px] rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-800 via-emerald-950 to-slate-900 p-6 text-center text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-emerald-200/10" dir="rtl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/12 text-emerald-100 ring-1 ring-white/10"><Boxes size={20} /></div>
          <p className="mt-5 text-[15px] font-medium leading-7 text-slate-200/85">القدرة المختارة</p>
          <h3 className="mt-2 text-[26px] font-bold leading-[1.45] text-white">{capability.name}</h3>
          {capability.standardized_name ? <p className="mt-2 truncate text-[13px] font-semibold text-slate-200/80 ltr" dir="ltr">{capability.standardized_name}</p> : null}
        </div>
        <div className="space-y-4">
          <DiagramGroup title="الإدارات المرتبطة" items={related.departments} type="Department" />
          <DiagramGroup title="الأنظمة الداعمة" items={related.systems} type="System" />
        </div>
      </div>
    </section>
  );
}

function DiagramGroup({ title, items, type }: { title: string; items: GraphNode[]; type: "Department" | "System" | "Project" }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 shadow-sm" dir="rtl">
      <p className="mb-2 text-[15px] font-bold leading-7 text-slate-700">{title}</p>
      <div className="space-y-2">
        {items.slice(0, 3).map((item) => <SmallEntity key={item.id} item={item} type={type} />)}
        {items.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-400">لا توجد عناصر مباشرة.</p> : null}
        {items.length > 3 ? <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-400">+{items.length - 3} عناصر أخرى</p> : null}
      </div>
    </div>
  );
}

function OverlapDiagramGroup({ overlaps }: { overlaps: Overlap[] }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3 shadow-sm" dir="rtl">
      <p className="mb-2 text-xs font-bold text-rose-700">التداخلات المحتملة</p>
      <div className="space-y-2">
        {overlaps.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border border-rose-100 bg-white p-2 text-right shadow-sm">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700"><AlertTriangle size={14} /></span>
            <span className="line-clamp-2 text-[15px] font-semibold leading-7 text-rose-800">{item.source_name} / {item.target_name}</span>
          </div>
        ))}
        {overlaps.length === 0 ? <p className="rounded-xl border border-dashed border-rose-100 bg-white px-3 py-3 text-xs text-rose-300">لا توجد تداخلات مباشرة.</p> : null}
        {overlaps.length > 3 ? <p className="rounded-xl border border-dashed border-rose-100 bg-white px-3 py-2 text-center text-xs font-semibold text-rose-400">+{overlaps.length - 3} عناصر أخرى</p> : null}
      </div>
    </div>
  );
}

function SmallEntity({ item, type }: { item: GraphNode; type: "Department" | "System" | "Project" }) {
  const Icon = type === "System" ? Server : type === "Department" ? Building2 : ClipboardList;
  const color = type === "System" ? "text-blue-700 bg-blue-50" : type === "Department" ? "text-teal bg-teal/10" : "text-violet-700 bg-violet-50";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-right shadow-sm">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${color}`}><Icon size={14} /></span>
      <span className="line-clamp-2 text-[15px] font-semibold leading-7 text-slate-900">{item.name}</span>
    </div>
  );
}

function RelationshipList({ title, icon: Icon, items, empty }: { title: string; icon: LucideIcon; items: GraphNode[]; empty: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-teal" />
        <h4 className="text-sm font-black text-ink">{title}</h4>
      </div>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 4).map((item) => <p key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">{item.name}</p>) : <p className="text-xs leading-6 text-slate-400">{empty}</p>}
      </div>
    </div>
  );
}

function OverlapList({ overlaps }: { overlaps: Overlap[] }) {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-rose-600" />
        <h4 className="text-sm font-black text-ink">التداخلات المحتملة</h4>
      </div>
      <div className="mt-3 space-y-2">
        {overlaps.length ? overlaps.slice(0, 3).map((item) => <p key={item.id} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-700">{item.source_name} / {item.target_name} · {item.score}</p>) : <p className="text-xs leading-6 text-slate-400">لا توجد تداخلات مباشرة.</p>}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: "blue" | "teal" | "purple" | "rose" }) {
  const color = {
    blue: "bg-blue-50 text-blue-700",
    teal: "bg-teal/10 text-teal",
    purple: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className={`rounded-2xl px-2 py-2 ${color}`}>
      <p className="text-lg font-black ltr">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold opacity-70">{label}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <CheckCircle2 className="mx-auto text-slate-300" size={34} />
      <h3 className="mt-4 text-lg font-black text-ink">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
