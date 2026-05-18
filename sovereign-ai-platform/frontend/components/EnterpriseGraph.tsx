"use client";

import ELK from "elkjs/lib/elk.bundled.js";
import {
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  Crosshair,
  Database,
  Filter,
  GitBranch,
  Layers3,
  Maximize2,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ar, localizeValue } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";

type RawNode = { id: string; label: string; name: string; description?: string; domain?: string; importance?: number; status?: string };
type RawEdge = { id: string; source: string; target: string; relationship: string; severity?: "low" | "medium" | "high" };
type GraphData = { nodes: RawNode[]; edges: RawEdge[] };
type LayerType = "Department" | "Capability" | "System" | "Project" | "KPI";
type ViewMode = "executive" | "capability" | "overlap" | "transformation";

type GraphNodeData = RawNode & {
  type: LayerType;
  subtitle: string;
  relationCount: number;
  compact: boolean;
  highlighted: boolean;
  dimmed: boolean;
  orphan: boolean;
  unsupported: boolean;
  overlap: boolean;
  showRisk: boolean;
  summary?: { type: LayerType; count: number };
  risk: "منخفض" | "متوسط" | "مرتفع";
};

type LayoutResult = {
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  height: number;
};

type DensityMode = "compact" | "balanced" | "full";

const layerOrder: LayerType[] = ["KPI", "Project", "System", "Capability", "Department"];
const layerLabels: Record<LayerType, string> = {
  Department: "الإدارات",
  Capability: "القدرات",
  System: "الأنظمة",
  Project: "المشاريع",
  KPI: "مؤشرات الأداء",
};

const layerHints: Record<LayerType, string> = {
  Department: "المالكون والجهات المنظمة",
  Capability: "قدرات الأعمال المحورية",
  System: "الأنظمة والمنصات الداعمة",
  Project: "المشاريع والمبادرات",
  KPI: "المؤشرات والأثر التنفيذي",
};

const layerStyles: Record<LayerType, { bg: string; band: string; border: string; text: string; icon: string; mini: string }> = {
  Department: { bg: "#f8fffc", band: "rgba(240, 253, 250, 0.55)", border: "#5eead4", text: "#0f766e", icon: "bg-teal/10 text-teal ring-1 ring-teal/15", mini: "#0f766e" },
  Capability: { bg: "#fbfdff", band: "rgba(239, 246, 255, 0.52)", border: "#93c5fd", text: "#2563eb", icon: "bg-blue-50 text-blue-600 ring-1 ring-blue-100", mini: "#2563eb" },
  System: { bg: "#fffdf8", band: "rgba(255, 251, 235, 0.55)", border: "#fbbf24", text: "#b7791f", icon: "bg-amber-50 text-amber-700 ring-1 ring-amber-100", mini: "#d97706" },
  Project: { bg: "#fffafa", band: "rgba(255, 241, 242, 0.5)", border: "#fda4af", text: "#be123c", icon: "bg-rose-50 text-rose-600 ring-1 ring-rose-100", mini: "#be123c" },
  KPI: { bg: "#fcfcfd", band: "rgba(248, 250, 252, 0.62)", border: "#cbd5e1", text: "#475569", icon: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", mini: "#64748b" },
};

const relationshipColors: Record<string, string> = {
  owns: "#0f766e",
  supports: "#d97706",
  enables: "#0891b2",
  depends_on: "#64748b",
  overlaps_with: "#be123c",
  measured_by: "#7c3aed",
  implemented_by: "#2563eb",
  used_by: "#0f766e",
  governed_by: "#334155",
  extracted_from: "#475569",
};

const viewModeLabels: Record<ViewMode, { label: string; helper: string; icon: typeof Sparkles }> = {
  executive: { label: "الملخص التنفيذي", helper: "قدرات وأنظمة وعلاقات ذات أولوية", icon: Sparkles },
  capability: { label: "أثر القدرة", helper: "تحقيق سياقي حول قدرة محددة", icon: Crosshair },
  overlap: { label: "تحليل التداخل", helper: "ازدواجية الأنظمة والقدرات", icon: ShieldAlert },
  transformation: { label: "مسار المشاريع", helper: "المشاريع والأنظمة المستهدفة", icon: GitBranch },
};

const defaultGraph: GraphData = {
  nodes: [
    { id: "dept-proc", label: "Department", name: "إدارة المشتريات", description: "تمتلك قدرات التوريد والمناقصات وأوامر الشراء وإدارة الموردين.", importance: 5 },
    { id: "dept-fin", label: "Department", name: "الإدارة المالية", description: "تحكم الميزانية والمطابقة المالية وتحليلات الإنفاق.", importance: 4 },
    { id: "dept-it", label: "Department", name: "إدارة تقنية المعلومات", description: "تشغّل الأنظمة والتكاملات والهوية والبيانات.", importance: 4 },
    { id: "dept-hr", label: "Department", name: "إدارة الموارد البشرية", description: "تدعم الصلاحيات والهياكل الوظيفية وأدوار الاعتماد.", importance: 3 },
    { id: "cap-source", label: "Capability", name: "Strategic Sourcing", domain: "Procurement", description: "تخطيط التوريد الاستراتيجي وتحليل السوق والفئات.", importance: 5 },
    { id: "cap-req", label: "Capability", name: "Purchase Requisition Management", domain: "Procurement", description: "إدارة طلبات الشراء واعتماداتها.", importance: 5 },
    { id: "cap-po", label: "Capability", name: "Purchase Order Management", domain: "Procurement", description: "إدارة أوامر الشراء والتعديلات والاستلام.", importance: 4 },
    { id: "cap-vendor", label: "Capability", name: "Vendor Registration", domain: "Procurement", description: "تسجيل الموردين والتحقق من بياناتهم.", importance: 4 },
    { id: "cap-contract", label: "Capability", name: "Contract Lifecycle Management", domain: "Procurement", description: "إدارة دورة حياة العقود والاعتمادات والتجديد.", importance: 5 },
    { id: "cap-budget", label: "Capability", name: "Budget Control", domain: "Finance", description: "التحقق من الميزانية والالتزام المالي.", importance: 4 },
    { id: "cap-invoice", label: "Capability", name: "Invoice Matching", domain: "Finance", description: "مطابقة الفاتورة مع أمر الشراء والاستلام.", importance: 4 },
    { id: "cap-spend", label: "Capability", name: "Spend Analytics", domain: "Finance", description: "تحليل الإنفاق ومؤشرات الالتزام والتوفير.", importance: 4 },
    { id: "cap-integration", label: "Capability", name: "Integration Management", domain: "Information Technology", description: "إدارة تكاملات الأنظمة والواجهات.", importance: 4 },
    { id: "cap-iam", label: "Capability", name: "Identity Access Management", domain: "Information Technology", description: "إدارة الهويات والصلاحيات والفصل بين المهام.", importance: 3 },
    { id: "cap-demand", label: "Capability", name: "Demand Forecasting", domain: "Procurement", description: "قدرة يتيمة لتوقع الطلب السنوي ولا يوجد مالك واضح لها.", importance: 3 },
    { id: "sys-erp", label: "System", name: "ERP Procurement", description: "نظام محوري لطلبات الشراء وأوامر الشراء والميزانية والفواتير.", importance: 5 },
    { id: "sys-eproc", label: "System", name: "eProcurement Portal", description: "بوابة إلكترونية للمناقصات وتعاون الموردين وطلبات الشراء.", importance: 4 },
    { id: "sys-supplier", label: "System", name: "Supplier Portal", description: "بوابة تسجيل الموردين وتحديث ملفاتهم وقياس الأداء.", importance: 4 },
    { id: "sys-budget", label: "System", name: "Budget System", description: "نظام الميزانية والالتزامات المالية.", importance: 3 },
    { id: "sys-contract", label: "System", name: "Contract Lifecycle Portal", description: "بوابة اعتماد العقود والتوقيع والتجديد والالتزام.", importance: 4 },
    { id: "sys-dwh", label: "System", name: "Data Warehouse", description: "مستودع بيانات مؤسسي لتحليلات الإنفاق ومؤشرات الأداء.", importance: 3 },
    { id: "proj-modern", label: "Project", name: "eProcurement Modernization", description: "تحديث رحلة الشراء والتكامل مع ERP والبوابات.", importance: 4 },
    { id: "proj-vendor", label: "Project", name: "Vendor Portal Upgrade", description: "تحديث تسجيل الموردين وسجل الأداء والتواصل.", importance: 4 },
    { id: "proj-contract", label: "Project", name: "Contract Digitization", description: "رقمنة العقود والاعتماد والتوقيع والأرشفة.", importance: 3 },
    { id: "proj-spend", label: "Project", name: "Spend Visibility Program", description: "بناء لوحات إنفاق وتحليلات ومؤشرات توفير.", importance: 3 },
    { id: "kpi-cycle", label: "KPI", name: "زمن دورة المشتريات", description: "خفض زمن دورة الشراء.", importance: 2 },
    { id: "kpi-compliance", label: "KPI", name: "نسبة الالتزام بالعقود", description: "رفع الالتزام بالعقود.", importance: 2 },
  ],
  edges: [
    { id: "e1", source: "dept-proc", target: "cap-source", relationship: "owns" },
    { id: "e2", source: "dept-proc", target: "cap-req", relationship: "owns" },
    { id: "e3", source: "dept-proc", target: "cap-po", relationship: "owns" },
    { id: "e4", source: "dept-proc", target: "cap-contract", relationship: "owns" },
    { id: "e5", source: "dept-fin", target: "cap-budget", relationship: "owns" },
    { id: "e6", source: "dept-fin", target: "cap-invoice", relationship: "owns" },
    { id: "e7", source: "dept-fin", target: "cap-spend", relationship: "governed_by" },
    { id: "e8", source: "dept-it", target: "cap-integration", relationship: "owns" },
    { id: "e9", source: "dept-it", target: "cap-iam", relationship: "owns" },
    { id: "e10", source: "sys-erp", target: "cap-req", relationship: "supports" },
    { id: "e11", source: "sys-erp", target: "cap-po", relationship: "supports" },
    { id: "e12", source: "sys-erp", target: "cap-budget", relationship: "supports" },
    { id: "e13", source: "sys-erp", target: "cap-invoice", relationship: "supports" },
    { id: "e14", source: "sys-eproc", target: "cap-req", relationship: "supports" },
    { id: "e15", source: "sys-eproc", target: "cap-po", relationship: "supports" },
    { id: "e16", source: "sys-eproc", target: "cap-source", relationship: "supports" },
    { id: "e17", source: "sys-supplier", target: "cap-vendor", relationship: "supports" },
    { id: "e18", source: "sys-supplier", target: "cap-spend", relationship: "enables" },
    { id: "e19", source: "sys-budget", target: "cap-budget", relationship: "supports" },
    { id: "e20", source: "sys-contract", target: "cap-contract", relationship: "supports" },
    { id: "e21", source: "sys-dwh", target: "cap-spend", relationship: "supports" },
    { id: "e22", source: "proj-modern", target: "sys-erp", relationship: "implemented_by" },
    { id: "e23", source: "proj-modern", target: "sys-eproc", relationship: "implemented_by" },
    { id: "e24", source: "proj-vendor", target: "sys-supplier", relationship: "implemented_by" },
    { id: "e25", source: "proj-contract", target: "sys-contract", relationship: "implemented_by" },
    { id: "e26", source: "proj-spend", target: "sys-dwh", relationship: "implemented_by" },
    { id: "e27", source: "cap-spend", target: "kpi-cycle", relationship: "measured_by" },
    { id: "e28", source: "cap-contract", target: "kpi-compliance", relationship: "measured_by" },
    { id: "e29", source: "sys-erp", target: "sys-eproc", relationship: "overlaps_with", severity: "high" },
    { id: "e30", source: "sys-supplier", target: "sys-eproc", relationship: "overlaps_with", severity: "medium" },
    { id: "e31", source: "proj-modern", target: "proj-vendor", relationship: "overlaps_with", severity: "high" },
    { id: "e32", source: "cap-contract", target: "cap-spend", relationship: "depends_on" },
  ],
};

const NODE_WIDTH = 214;
const BASE_NODE_HEIGHT = 88;
const LAYER_GAP = 108;
const NODE_GAP = 62;
const LAYER_TOP = 112;
const elk = new ELK();

const densityLabels: Record<DensityMode, string> = {
  compact: "مختصر",
  balanced: "متوسط",
  full: "كامل",
};

const summaryLabels: Record<LayerType, string> = {
  Department: "إدارات إضافية",
  Capability: "قدرات إضافية",
  System: "أنظمة إضافية",
  Project: "مشاريع إضافية",
  KPI: "مؤشرات إضافية",
};

function normalizeNode(node: RawNode): RawNode | null {
  const label = node.label === "OrganizationUnit" ? "Department" : node.label === "Application" ? "System" : node.label;
  if (!layerOrder.includes(label as LayerType)) return null;
  return { ...node, label, importance: node.importance ?? 2 };
}

function mergeGraph(apiGraph: GraphData): GraphData {
  const nodes = new Map<string, RawNode>();
  const edges = new Map<string, RawEdge>();
  for (const node of defaultGraph.nodes) nodes.set(node.id, node);
  for (const raw of apiGraph.nodes) {
    const node = normalizeNode(raw);
    if (node) nodes.set(node.id, node);
  }
  for (const edge of defaultGraph.edges) edges.set(edge.id, edge);
  for (const edge of apiGraph.edges) edges.set(edge.id, edge);
  return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()) };
}

function relationshipCount(node: RawNode, edges: RawEdge[]) {
  return edges.filter((edge) => edge.source === node.id || edge.target === node.id).length;
}

function groupKey(node: RawNode): string {
  if (node.label === "Capability") return node.domain ?? "Procurement";
  if (node.label === "System") {
    if (/ERP|Budget/i.test(node.name)) return "الأنظمة الأساسية";
    if (/Portal|بوابة/i.test(node.name)) return "البوابات";
    return "منصات البيانات والتكامل";
  }
  if (node.label === "Project") {
    if (/Vendor|Supplier|مورد/i.test(node.name)) return "برنامج الموردين";
    if (/Contract|عقد/i.test(node.name)) return "برنامج العقود";
    return "برنامج التطبيقات المؤسسية";
  }
  return layerLabels[node.label as LayerType] ?? node.label;
}

function nodeHeight(node: RawNode) {
  const words = node.name.split(" ").length;
  const description = node.description ? 8 : 0;
  return BASE_NODE_HEIGHT + Math.min(20, Math.max(0, words - 3) * 5) + description;
}

function directNodeIds(selectedId: string | null, edges: RawEdge[]) {
  const ids = new Set<string>();
  if (!selectedId) return ids;
  ids.add(selectedId);
  for (const edge of edges) {
    if (edge.source === selectedId) ids.add(edge.target);
    if (edge.target === selectedId) ids.add(edge.source);
  }
  return ids;
}

function impactNodeIds(selectedId: string | null, edges: RawEdge[]) {
  if (!selectedId) return new Set<string>();
  const ids = new Set<string>([selectedId]);
  let frontier = new Set<string>([selectedId]);
  for (let depth = 0; depth < 4; depth++) {
    const next = new Set<string>();
    for (const edge of edges) {
      if (frontier.has(edge.source) && !ids.has(edge.target)) next.add(edge.target);
      if (frontier.has(edge.target) && !ids.has(edge.source)) next.add(edge.source);
    }
    for (const id of next) ids.add(id);
    frontier = next;
  }
  return ids;
}

function overlapNodeIds(edges: RawEdge[]) {
  const ids = new Set<string>();
  for (const edge of edges) {
    if (edge.relationship === "overlaps_with") {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  }
  return ids;
}

function searchNodeIds(query: string, nodes: RawNode[], edges: RawEdge[]) {
  const lowered = query.trim().toLowerCase();
  if (!lowered) return null;
  const ids = new Set<string>();
  for (const node of nodes) {
    if (`${node.name} ${node.description ?? ""} ${node.domain ?? ""}`.toLowerCase().includes(lowered)) {
      ids.add(node.id);
      for (const edge of edges) {
        if (edge.source === node.id) ids.add(edge.target);
        if (edge.target === node.id) ids.add(edge.source);
      }
    }
  }
  return ids;
}

function executiveNodeIds(nodes: RawNode[], edges: RawEdge[]) {
  const topCapabilities = nodes
    .filter((node) => node.label === "Capability")
    .sort((a, b) => relationshipCount(b, edges) - relationshipCount(a, edges) || (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 5);
  const ids = new Set<string>();
  for (const node of nodes) {
    if (node.label === "Department") ids.add(node.id);
  }
  for (const capability of topCapabilities) ids.add(capability.id);
  for (const edge of edges) {
    const source = nodes.find((node) => node.id === edge.source);
    const target = nodes.find((node) => node.id === edge.target);
    const touchesCapability = topCapabilities.some((node) => node.id === edge.source || node.id === edge.target);
    if (touchesCapability && (source?.label === "System" || target?.label === "System" || edge.relationship === "owns" || edge.relationship === "governed_by")) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  }
  return ids;
}

function contextualExecutiveNodeIds(nodes: RawNode[], edges: RawEdge[]) {
  const ids = executiveNodeIds(nodes, edges);
  for (const edge of edges) {
    if (edge.relationship === "overlaps_with" && edge.severity === "high") {
      ids.add(edge.source);
      ids.add(edge.target);
    }
    if (edge.relationship === "measured_by") {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  }
  return ids;
}

function capabilityImpactNodeIds(selectedId: string | null, nodes: RawNode[], edges: RawEdge[]) {
  if (!selectedId) {
    const top = nodes
      .filter((node) => node.label === "Capability")
      .sort((a, b) => relationshipCount(b, edges) - relationshipCount(a, edges) || (b.importance ?? 0) - (a.importance ?? 0))[0];
    selectedId = top?.id ?? null;
  }
  const ids = directNodeIds(selectedId, edges);
  if (selectedId) ids.add(selectedId);
  return ids;
}

function transformationNodeIds(nodes: RawNode[], edges: RawEdge[]) {
  const ids = new Set<string>();
  const projects = nodes
    .filter((node) => node.label === "Project")
    .sort((a, b) => relationshipCount(b, edges) - relationshipCount(a, edges))
    .slice(0, 4);
  for (const project of projects) ids.add(project.id);
  for (const edge of edges) {
    if (ids.has(edge.source) || ids.has(edge.target)) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  }
  for (const edge of edges) {
    if (ids.has(edge.source) || ids.has(edge.target)) {
      const source = nodes.find((node) => node.id === edge.source);
      const target = nodes.find((node) => node.id === edge.target);
      if (source?.label === "Capability" || target?.label === "Capability") {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    }
  }
  return ids;
}

function displayEdge(edge: RawEdge, nodeById: Map<string, RawNode>): RawEdge {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!source || !target) return edge;
  const sourceLayer = layerOrder.indexOf(source.label as LayerType);
  const targetLayer = layerOrder.indexOf(target.label as LayerType);
  if (sourceLayer <= targetLayer) return edge;
  return { ...edge, source: edge.target, target: edge.source };
}

function displayEdges(edges: RawEdge[], nodes: RawNode[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return edges.map((edge) => displayEdge(edge, nodeById));
}

function visibleNodeIds(nodes: RawNode[], edges: RawEdge[], selectedId: string | null, mode: ViewMode, query: string, density: DensityMode) {
  const searchIds = searchNodeIds(query, nodes, edges);
  if (searchIds) return searchIds;
  if (mode === "overlap") {
    const ids = overlapNodeIds(edges);
    for (const edge of edges) {
      if (ids.has(edge.source) || ids.has(edge.target)) {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    }
    return ids.size ? ids : executiveNodeIds(nodes, edges);
  }
  if (mode === "capability") return selectedId ? impactNodeIds(selectedId, edges) : capabilityImpactNodeIds(selectedId, nodes, edges);
  if (mode === "transformation") return transformationNodeIds(nodes, edges);
  if (selectedId) return directNodeIds(selectedId, edges);
  if (density === "full") return contextualExecutiveNodeIds(nodes, edges);
  return contextualExecutiveNodeIds(nodes, edges);
}

function edgeVisible(edge: RawEdge, mode: ViewMode, density: DensityMode, selectedId: string | null, visibleIds: Set<string>, directIds: Set<string>, impactIds: Set<string>) {
  if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return false;
  if (density === "full") return true;
  if (mode === "overlap") return edge.relationship === "overlaps_with" || (density === "balanced" && directIds.has(edge.source) && directIds.has(edge.target));
  if (mode === "capability") return selectedId ? impactIds.has(edge.source) && impactIds.has(edge.target) : ["owns", "supports", "enables", "implemented_by", "measured_by", "depends_on"].includes(edge.relationship);
  if (mode === "transformation") return ["implemented_by", "supports", "enables", "measured_by", "depends_on", "overlaps_with"].includes(edge.relationship);
  if (selectedId) return directIds.has(edge.source) && directIds.has(edge.target);
  if (density === "balanced") return ["owns", "supports", "governed_by", "overlaps_with", "implemented_by", "measured_by"].includes(edge.relationship);
  return ["owns", "supports", "governed_by"].includes(edge.relationship);
}

function getRisk(node: RawNode, edges: RawEdge[]) {
  const hasOwner = edges.some((edge) => (edge.target === node.id || edge.source === node.id) && ["owns", "governed_by"].includes(edge.relationship));
  const hasSupport = edges.some((edge) => (edge.target === node.id || edge.source === node.id) && ["supports", "enables"].includes(edge.relationship));
  const hasOverlap = edges.some((edge) => (edge.source === node.id || edge.target === node.id) && edge.relationship === "overlaps_with");
  if (node.label === "Capability" && (!hasOwner || !hasSupport)) return "مرتفع";
  if (hasOverlap) return "متوسط";
  return "منخفض";
}

function isUnsupportedCapability(node: RawNode, edges: RawEdge[]) {
  return node.label === "Capability" && !edges.some((edge) => (edge.target === node.id || edge.source === node.id) && ["supports", "enables"].includes(edge.relationship));
}

function isOrphanCapability(node: RawNode, edges: RawEdge[]) {
  return node.label === "Capability" && !edges.some((edge) => (edge.target === node.id || edge.source === node.id) && ["owns", "governed_by"].includes(edge.relationship));
}

function collapseExtras(nodes: RawNode[], edges: RawEdge[], expandedTypes: Set<LayerType>, selectedId: string | null, mode: ViewMode, query: string) {
  if (selectedId || query.trim()) return nodes;
  const limits: Record<LayerType, number> =
    mode === "executive"
      ? { Department: 3, Capability: 5, System: 4, Project: 2, KPI: 2 }
      : mode === "overlap"
        ? { Department: 1, Capability: 4, System: 5, Project: 3, KPI: 1 }
        : { Department: 3, Capability: 6, System: 5, Project: 4, KPI: 2 };
  const output: RawNode[] = [];
  for (const type of layerOrder) {
    const layerNodes = nodes
      .filter((node) => node.label === type)
      .sort((a, b) => relationshipCount(b, edges) - relationshipCount(a, edges) || (b.importance ?? 0) - (a.importance ?? 0));
    const limit = limits[type];
    if (expandedTypes.has(type) || layerNodes.length <= limit) {
      output.push(...layerNodes);
      continue;
    }
    output.push(...layerNodes.slice(0, limit));
    output.push({
      id: `summary-${type}`,
      label: type,
      name: `+${layerNodes.length - limit} ${summaryLabels[type]}`,
      description: "انقر لعرض العناصر الإضافية في هذه الطبقة.",
      importance: 1,
    });
  }
  return output;
}

function impactBuckets(selectedId: string | null, nodes: RawNode[], edges: RawEdge[]) {
  const ids = impactNodeIds(selectedId, edges);
  const direct = directNodeIds(selectedId, edges);
  const upstream = new Set<string>();
  const downstream = new Set<string>();
  if (selectedId) {
    const selected = nodes.find((node) => node.id === selectedId);
    const selectedIndex = selected ? layerOrder.indexOf(selected.label as LayerType) : -1;
    for (const id of ids) {
      const node = nodes.find((item) => item.id === id);
      if (!node || node.id === selectedId) continue;
      const index = layerOrder.indexOf(node.label as LayerType);
      if (index < selectedIndex) upstream.add(id);
      if (index > selectedIndex) downstream.add(id);
    }
  }
  return { ids, direct, upstream, downstream };
}

function computeInsights(nodes: RawNode[], edges: RawEdge[]) {
  const highOverlaps = edges.filter((edge) => edge.relationship === "overlaps_with" && edge.severity === "high").length;
  const orphanCapabilities = nodes.filter((node) => isOrphanCapability(node, edges)).length;
  const highDependencySystems = nodes.filter((node) => node.label === "System" && relationshipCount(node, edges) >= 4).length;
  const highImpactProjects = nodes.filter((node) => node.label === "Project" && relationshipCount(node, edges) >= 2).length;
  const impactedKpis = new Set(edges.filter((edge) => edge.relationship === "measured_by").map((edge) => edge.target)).size;
  return { highOverlaps, orphanCapabilities, highDependencySystems, highImpactProjects, impactedKpis };
}

async function buildLayout(
  nodes: RawNode[],
  edges: RawEdge[],
  directIds: Set<string>,
  impactIds: Set<string>,
  selectedId: string | null,
  compact: boolean,
  hoveredId: string | null,
  showRisk: boolean,
  hoveredEdgeId: string | null,
): Promise<LayoutResult> {
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "LEFT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": `${NODE_GAP}`,
      "elk.layered.spacing.nodeNodeBetweenLayers": `${LAYER_GAP}`,
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: nodes.map((node) => ({ id: node.id, width: NODE_WIDTH, height: nodeHeight(node) })),
    edges: edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  };
  const result = await elk.layout(elkGraph);
  const elkY = new Map((result.children ?? []).map((child) => [child.id, child.y ?? 0]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const columnHeight = new Map<LayerType, number>();
  const layerX = new Map<LayerType, number>();
  const activeTypes = layerOrder.filter((type) => nodes.some((node) => node.label === type));
  activeTypes.forEach((type, index) => layerX.set(type, index * (NODE_WIDTH + LAYER_GAP)));

  const rfNodes: Node<GraphNodeData>[] = [];
  let maxHeight = 760;
  for (const type of activeTypes) {
    const layerNodes = nodes
      .filter((node) => node.label === type)
      .sort((a, b) => (elkY.get(a.id) ?? 0) - (elkY.get(b.id) ?? 0) || relationshipCount(b, edges) - relationshipCount(a, edges));
    let y = LAYER_TOP;
    for (const node of layerNodes) {
      const height = nodeHeight(node);
      const overlap = edges.some((edge) => (edge.source === node.id || edge.target === node.id) && edge.relationship === "overlaps_with");
      const orphan = isOrphanCapability(node, edges);
      const unsupported = isUnsupportedCapability(node, edges);
      const highlighted = node.id === selectedId || node.id === hoveredId || directIds.has(node.id);
      const dimmed = Boolean(selectedId || hoveredId) && !impactIds.has(node.id) && node.id !== hoveredId;
      const summary = node.id.startsWith("summary-") ? { type, count: Number(node.name.match(/\+(\d+)/)?.[1] ?? 0) } : undefined;
      rfNodes.push({
        id: node.id,
        type: "enterpriseNode",
        position: { x: layerX.get(type) ?? 0, y },
        width: NODE_WIDTH,
        height,
        data: {
          ...node,
          type,
          subtitle: groupKey(node),
          relationCount: relationshipCount(node, edges),
          compact,
          highlighted,
          dimmed,
          orphan,
          unsupported,
          overlap,
          showRisk,
          summary,
          risk: getRisk(node, edges),
        },
      });
      y += height + NODE_GAP;
    }
    columnHeight.set(type, y);
    maxHeight = Math.max(maxHeight, y + 180);
  }

  const rfEdges: Edge[] = edges.map((edge) => {
    const highlighted = Boolean(selectedId) && (edge.source === selectedId || edge.target === selectedId);
    const hovered = Boolean(hoveredId) && (edge.source === hoveredId || edge.target === hoveredId);
    const edgeHovered = edge.id === hoveredEdgeId;
    const direct = highlighted || hovered || edgeHovered;
    const color = relationshipColors[edge.relationship] ?? "#64748b";
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      label: direct ? localizeValue(edge.relationship) : undefined,
      animated: direct,
      style: {
        stroke: color,
        strokeWidth: direct ? 2.4 : 1.15,
        opacity: selectedId || hoveredId ? (direct ? 0.92 : 0.08) : 0.18,
      },
      labelStyle: { fill: color, fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.86 },
      markerEnd: { type: "arrowclosed", color },
      data: edge,
    };
  });

  return { nodes: rfNodes, edges: rfEdges, height: maxHeight };
}

function EnterpriseNode({ data, selected }: NodeProps) {
  const node = data as GraphNodeData;
  const style = layerStyles[node.type];
  const Icon = nodeIcon(node.type);
  const dir = /[A-Za-z]/.test(node.name) ? "ltr" : "rtl";
  if (node.summary) {
    return (
      <button
        className="w-[214px] rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-center shadow-[0_8px_22px_rgba(15,23,42,0.05)] backdrop-blur transition hover:-translate-y-0.5 hover:border-teal/40 hover:bg-white"
        style={{ minHeight: 84 }}
        title="عرض العناصر الإضافية"
      >
        <Handle type="source" position={Position.Left} className="!opacity-0" />
        <Handle type="target" position={Position.Right} className="!opacity-0" />
        <p className="text-xl font-semibold text-teal ltr">+{node.summary.count}</p>
        <p className="mt-1 text-xs font-semibold text-slate-700">{summaryLabels[node.summary.type]}</p>
        <p className="mt-1 text-[10px] text-slate-400">انقر للتوسيع</p>
      </button>
    );
  }
  return (
    <div
      className={`group relative w-[214px] rounded-[18px] border bg-white/95 p-3 text-right shadow-[0_10px_26px_rgba(15,23,42,0.055)] backdrop-blur transition duration-200 ${
        node.dimmed ? "opacity-15" : "opacity-100"
      } ${selected || node.highlighted ? "scale-[1.02] shadow-[0_18px_42px_rgba(15,118,110,0.16)] ring-2 ring-teal/18" : "hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.09)]"}`}
      style={{ borderColor: selected || node.highlighted ? "#0f766e" : "rgba(148, 163, 184, 0.28)", background: `linear-gradient(180deg, #ffffff 0%, ${style.bg} 100%)` }}
      title={node.name}
    >
      <Handle type="source" position={Position.Left} className="!h-2 !w-2 !border !border-white !opacity-60" style={{ background: style.text }} />
      <Handle type="target" position={Position.Right} className="!h-2 !w-2 !border !border-white !opacity-60" style={{ background: style.text }} />
      <div className="flex items-start justify-between gap-2.5">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${style.icon}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-wide" style={{ color: style.text }}>
            {layerLabels[node.type]}
          </p>
          <h4 className={`mt-0.5 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-950 ${dir === "ltr" ? "ltr text-left" : "text-right"}`}>{node.name}</h4>
        </div>
      </div>
      {!node.compact ? (
        <p className="mt-2 line-clamp-1 text-[11px] leading-5 text-slate-500">{node.description ?? node.subtitle}</p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
        <span className="max-w-[125px] truncate rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200/70">{localizeValue(node.subtitle)}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold ring-1 ring-slate-200/70" style={{ color: style.text }}>
          {node.relationCount} علاقة
        </span>
      </div>
      {node.showRisk && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <NodeFlag tone={node.risk === "مرتفع" ? "rose" : node.risk === "متوسط" ? "amber" : "green"}>{node.risk === "مرتفع" ? "أولوية عالية" : node.risk === "متوسط" ? "أولوية متوسطة" : "مستقر"}</NodeFlag>
          {node.orphan ? <NodeFlag tone="rose">بلا مالك</NodeFlag> : null}
          {node.unsupported ? <NodeFlag tone="amber">بلا نظام داعم</NodeFlag> : null}
        </div>
      )}
      {!node.showRisk && (node.orphan || node.overlap) && (
        <div className="mt-2 flex gap-1.5">
          {node.orphan ? <NodeFlag tone="rose">قدرة بلا مالك</NodeFlag> : null}
          {node.overlap ? <NodeFlag tone="amber">تداخل محتمل</NodeFlag> : null}
        </div>
      )}
    </div>
  );
}

function nodeIcon(type: LayerType) {
  if (type === "Department") return Building2;
  if (type === "Capability") return Boxes;
  if (type === "System") return Database;
  if (type === "Project") return Layers3;
  return BarChart3;
}

function GraphCanvas({
  graph,
  overlapCount,
}: {
  graph: GraphData;
  overlapCount: number;
}) {
  const reactFlow = useReactFlow();
  const [viewMode, setViewMode] = useState<ViewMode>("executive");
  const [densityMode, setDensityMode] = useState<DensityMode>("compact");
  const [showRisk, setShowRisk] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [relationshipFilter, setRelationshipFilter] = useState("all");
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerType, boolean>>({
    KPI: true,
    Project: true,
    System: true,
    Capability: true,
    Department: true,
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<LayerType>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.82);
  const [layout, setLayout] = useState<LayoutResult>({ nodes: [], edges: [], height: 820 });
  const didDefaultFocus = useRef(false);

  const merged = useMemo(() => mergeGraph(graph), [graph]);
  const normalizedNodes = useMemo(() => merged.nodes.map((node) => normalizeNode(node)).filter((node): node is RawNode => Boolean(node)), [merged.nodes]);
  const visualEdges = useMemo(() => displayEdges(merged.edges, normalizedNodes), [merged.edges, normalizedNodes]);
  const byRawId = useMemo(() => new Map(normalizedNodes.map((node) => [node.id, node])), [normalizedNodes]);
  const relationshipTypes = useMemo(() => Array.from(new Set(visualEdges.map((edge) => edge.relationship))).sort(), [visualEdges]);
  const groupNames = useMemo(() => Array.from(new Set(normalizedNodes.map(groupKey))).sort(), [normalizedNodes]);
  const visibleIds = useMemo(() => visibleNodeIds(normalizedNodes, visualEdges, selectedId, viewMode, query, densityMode), [densityMode, normalizedNodes, query, selectedId, viewMode, visualEdges]);
  const activeFocusId = selectedId ?? hoveredId;
  const directIds = useMemo(() => directNodeIds(activeFocusId, visualEdges), [activeFocusId, visualEdges]);
  const impact = useMemo(() => impactBuckets(activeFocusId, normalizedNodes, visualEdges), [activeFocusId, normalizedNodes, visualEdges]);
  const impactIds = impact.ids;
  const insights = useMemo(() => computeInsights(normalizedNodes, visualEdges), [normalizedNodes, visualEdges]);

  useEffect(() => {
    if (didDefaultFocus.current || selectedId || !normalizedNodes.length) return;
    const defaultFocus = normalizedNodes.find((node) => node.id === "cap-contract") ?? normalizedNodes.find((node) => node.label === "Capability") ?? normalizedNodes[0];
    didDefaultFocus.current = true;
    setSelectedId(defaultFocus.id);
  }, [normalizedNodes, selectedId]);

  const filteredNodes = useMemo(
    () => {
      const visible = normalizedNodes
        .filter((node) => (selectedId ? directIds.has(node.id) : visibleIds.has(node.id)))
        .filter((node) => visibleLayers[node.label as LayerType])
        .filter((node) => typeFilter === "all" || node.label === typeFilter)
        .filter((node) => !collapsedGroups.has(groupKey(node)));
      return collapseExtras(visible, visualEdges, expandedTypes, selectedId, viewMode, query);
    },
    [collapsedGroups, directIds, expandedTypes, normalizedNodes, query, selectedId, typeFilter, viewMode, visibleIds, visibleLayers, visualEdges],
  );
  const filteredIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const filteredEdges = useMemo(
    () =>
      visualEdges
        .filter((edge) => filteredIds.has(edge.source) && filteredIds.has(edge.target))
        .filter((edge) => relationshipFilter === "all" || edge.relationship === relationshipFilter)
        .filter((edge) => edgeVisible(edge, viewMode, densityMode, selectedId, visibleIds, directIds, impactIds)),
    [densityMode, directIds, filteredIds, impactIds, relationshipFilter, selectedId, viewMode, visibleIds, visualEdges],
  );

  useEffect(() => {
    let active = true;
    buildLayout(filteredNodes, filteredEdges, directIds, impactIds, selectedId, zoom < 0.72, hoveredId, showRisk, hoveredEdgeId).then((nextLayout) => {
      if (active) setLayout(nextLayout);
    });
    return () => {
      active = false;
    };
  }, [directIds, filteredEdges, filteredNodes, hoveredEdgeId, hoveredId, impactIds, selectedId, showRisk, zoom]);

  useEffect(() => {
    const id = window.setTimeout(() => reactFlow.fitView({ padding: 0.12, duration: 450 }), 120);
    return () => window.clearTimeout(id);
  }, [layout.nodes.length, reactFlow, viewMode]);

  useEffect(() => {
    if (!selectedId) return;
    const id = window.setTimeout(() => reactFlow.fitView({ nodes: [{ id: selectedId }], padding: 1.05, duration: 520 }), 140);
    return () => window.clearTimeout(id);
  }, [reactFlow, selectedId]);

  const selected = selectedId ? byRawId.get(selectedId) : undefined;
  const selectedEdges = useMemo(() => visualEdges.filter((edge) => edge.source === selectedId || edge.target === selectedId), [selectedId, visualEdges]);
  const selectedConnections = useMemo(
    () => selectedEdges.map((edge) => byRawId.get(edge.source === selectedId ? edge.target : edge.source)).filter((node): node is RawNode => Boolean(node)),
    [byRawId, selectedEdges, selectedId],
  );

  const stats = {
    totalNodes: filteredNodes.length,
    totalRelationships: filteredEdges.length,
    capabilityCount: filteredNodes.filter((node) => node.label === "Capability").length,
    systemsCount: filteredNodes.filter((node) => node.label === "System").length,
  };

  const nodeTypes = useMemo(() => ({ enterpriseNode: EnterpriseNode }), []);

  const focusSearch = useCallback(() => {
    const lowered = query.trim().toLowerCase();
    const hit = normalizedNodes.find((node) => `${node.name} ${node.description ?? ""}`.toLowerCase().includes(lowered));
    if (hit) {
      setSelectedId(hit.id);
      setViewMode("capability");
      window.setTimeout(() => reactFlow.fitView({ nodes: [{ id: hit.id }], padding: 0.8, duration: 500 }), 80);
    }
  }, [normalizedNodes, query, reactFlow]);

  function resetView() {
    setSelectedId(null);
    setHoveredId(null);
    setHoveredEdgeId(null);
    setQuery("");
    setTypeFilter("all");
    setRelationshipFilter("all");
    setVisibleLayers({ KPI: true, Project: true, System: true, Capability: true, Department: true });
    setViewMode("executive");
    setDensityMode("compact");
    didDefaultFocus.current = false;
    reactFlow.fitView({ padding: 0.12, duration: 500 });
  }

  function clearFocus() {
    setSelectedId(null);
    setHoveredId(null);
    setHoveredEdgeId(null);
    if (viewMode === "capability") setViewMode("executive");
  }

  function connectedByType(type: LayerType) {
    return selectedConnections.filter((node) => node.label === type);
  }

  const relatedKpis = connectedByType("KPI");
  const relatedProjects = connectedByType("Project");
  const relatedSystems = connectedByType("System");
  const relatedCapabilities = connectedByType("Capability");
  const relatedDepartments = connectedByType("Department");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex max-w-3xl gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-4 top-3 text-slate-400" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") focusSearch();
              }}
              placeholder="ابحث عن نظام أو قدرة أو مشروع..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-4 pr-11 text-sm outline-none transition focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <button onClick={focusSearch} className="rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-teal">بحث</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SimpleKpi label="التداخلات الحرجة" value={insights.highOverlaps} tone="rose" />
          <SimpleKpi label="القدرات غير المغطاة" value={insights.orphanCapabilities} tone="amber" />
          <SimpleKpi label="الأنظمة عالية التأثير" value={insights.highDependencySystems} tone="teal" />
        </div>
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_340px_1fr]">
        <RelatedColumn title="المؤشرات والمشاريع المرتبطة" items={connectedByType("KPI").concat(connectedByType("Project"))} onSelect={setSelectedId} empty="لا توجد مؤشرات أو مشاريع مباشرة." />
        <FocusedEntityCard selected={selected} relationCount={selectedEdges.length} risk={selected ? getRisk(selected, selectedEdges) : "منخفض"} onClear={clearFocus} />
        <RelatedColumn title="الأنظمة والقدرات المرتبطة" items={connectedByType("System").concat(connectedByType("Capability"), connectedByType("Department"))} onSelect={setSelectedId} empty="لا توجد أنظمة أو قدرات مباشرة." />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.055)]">
        <div className="grid gap-0 lg:grid-cols-[285px_1fr]">
          <EntityDetailsPanel selected={selected} relationCount={selectedEdges.length} departments={relatedDepartments} risk={selected ? getRisk(selected, selectedEdges) : "منخفض"} />
          <div>
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">مسار العلاقات المباشرة</p>
              <p className="mt-1 text-xs text-slate-400">يظهر فقط ما يرتبط بالعنصر المحدد مباشرة.</p>
            </div>
            <ManualRelationshipMap
              selected={selected}
              kpis={relatedKpis}
              projects={relatedProjects}
              systems={relatedSystems}
              capabilities={relatedCapabilities}
              onSelect={setSelectedId}
            />
          </div>
        </div>
      </section>

      <ImpactSummary selected={selected} upstream={impact.upstream} downstream={impact.downstream} byRawId={byRawId} overlaps={selectedEdges.filter((edge) => edge.relationship === "overlaps_with")} />
    </div>
  );
}

export function EnterpriseGraph({ graph, overlapCount = 0 }: { graph: GraphData; overlapCount?: number }) {
  return (
    <ReactFlowProvider>
      <GraphCanvas graph={graph} overlapCount={overlapCount} />
    </ReactFlowProvider>
  );
}

function SimpleKpi({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "teal" }) {
  const classes = {
    rose: "text-rose-700 bg-rose-50 border-rose-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    teal: "text-teal bg-teal/10 border-teal/10",
  }[tone];
  return (
    <div className={`rounded-2xl border px-4 py-3 ${classes}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-semibold ltr">{value}</p>
    </div>
  );
}

function RelatedColumn({ title, items, empty, onSelect }: { title: string; items: RawNode[]; empty: string; onSelect: (id: string) => void }) {
  return (
    <section className="rounded-[26px] border border-slate-200/70 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.055)]">
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <div className="mt-3 grid gap-2">
        {items.length ? (
          <>
          {items.slice(0, 4).map((item) => {
            const type = item.label as LayerType;
            const Icon = nodeIcon(type);
            return (
              <button key={item.id} onClick={() => onSelect(item.id)} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-right transition hover:border-teal/25 hover:bg-white hover:shadow-sm">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${layerStyles[type].icon}`}>
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{item.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{localizeValue(item.label)}</span>
                </span>
              </button>
            );
          })}
          {items.length > 4 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-400">+{items.length - 4} عناصر أخرى</div> : null}
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-400">{empty}</p>
        )}
      </div>
    </section>
  );
}

function FocusedEntityCard({ selected, relationCount, risk, onClear }: { selected?: RawNode; relationCount: number; risk: string; onClear: () => void }) {
  const type = (selected?.label as LayerType) ?? "System";
  const Icon = nodeIcon(type);
  return (
    <section className="rounded-[30px] border border-slate-200/70 bg-slate-950 p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10`}>
          <Icon size={20} />
        </span>
        {selected ? (
          <button onClick={onClear} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white">إلغاء التركيز</button>
        ) : null}
      </div>
      <p className="mt-6 text-xs font-medium text-white/45">العنصر المحدد</p>
      <h3 className="mt-2 text-2xl font-semibold leading-9">{selected?.name ?? "اختر عنصرًا للبدء"}</h3>
      <p className="mt-3 text-sm leading-7 text-white/65">{selected?.description ?? "استخدم البحث أو اختر عنصرًا مرتبطًا لعرض أثره المباشر."}</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/7 p-3">
          <p className="text-[10px] text-white/45">العلاقات المباشرة</p>
          <p className="mt-1 text-2xl font-semibold ltr">{relationCount}</p>
        </div>
        <div className="rounded-2xl bg-white/7 p-3">
          <p className="text-[10px] text-white/45">مستوى الأولوية</p>
          <p className="mt-1 text-lg font-semibold">{risk}</p>
        </div>
      </div>
    </section>
  );
}

function EntityDetailsPanel({ selected, relationCount, departments, risk }: { selected?: RawNode; relationCount: number; departments: RawNode[]; risk: string }) {
  return (
    <aside className="border-b border-slate-100 bg-slate-50/70 p-5 lg:border-b-0 lg:border-l">
      <p className="text-xs font-semibold text-slate-400">تفاصيل العنصر المحدد</p>
      <h4 className="mt-3 text-xl font-semibold leading-8 text-slate-950">{selected?.name ?? "اختر عنصرًا"}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-500">{selected?.description ?? "حدد عنصرًا لعرض تفاصيل التحقيق المباشر."}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
          <p className="text-[10px] text-slate-400">العلاقات</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950 ltr">{relationCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
          <p className="text-[10px] text-slate-400">الأولوية</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{risk}</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
        <p className="text-xs font-semibold text-slate-950">الإدارات المرتبطة</p>
        <div className="mt-2 space-y-1">
          {departments.length ? departments.slice(0, 3).map((item) => <p key={item.id} className="truncate text-xs leading-6 text-slate-500">{item.name}</p>) : <p className="text-xs text-slate-400">لا توجد إدارة مباشرة.</p>}
        </div>
      </div>
    </aside>
  );
}

function ManualRelationshipMap({
  selected,
  kpis,
  projects,
  systems,
  capabilities,
  onSelect,
}: {
  selected?: RawNode;
  kpis: RawNode[];
  projects: RawNode[];
  systems: RawNode[];
  capabilities: RawNode[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative min-h-[520px] overflow-visible bg-white px-6 py-10" dir="ltr">
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="arrow-kpi" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#d97706" />
          </marker>
          <marker id="arrow-project" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#7c3aed" />
          </marker>
          <marker id="arrow-system" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
          </marker>
          <marker id="arrow-capability" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e" />
          </marker>
        </defs>

        <path d="M45 50 C40 50 36 50 31 50" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow-project)" opacity="0.85" vectorEffect="non-scaling-stroke" />
        <path d="M25 50 C21 50 18 50 14 50" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow-kpi)" opacity="0.85" vectorEffect="non-scaling-stroke" />
        <path d="M55 50 C60 50 64 50 69 50" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow-system)" opacity="0.85" vectorEffect="non-scaling-stroke" />
        <path d="M75 50 C79 50 82 50 86 50" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow-capability)" opacity="0.85" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative z-10 grid min-h-[440px] grid-cols-5 items-center gap-5">
        <MapGroup title="مؤشرات الأداء المتأثرة" items={kpis} type="KPI" onSelect={onSelect} />
        <MapGroup title="المشاريع المرتبطة" items={projects} type="Project" onSelect={onSelect} />

        <div className="mx-auto w-full max-w-[220px] rounded-[22px] border border-slate-800 bg-slate-950 p-5 text-center text-white shadow-[0_28px_80px_rgba(15,23,42,0.25)] ring-1 ring-white/5" dir="rtl">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <Boxes size={19} />
          </div>
          <p className="mt-5 text-xs text-white/45">العنصر المحدد</p>
          <h3 className="mt-2 text-xl font-semibold leading-8">{selected?.name ?? "اختر عنصرًا"}</h3>
          <p className="mt-3 line-clamp-2 text-xs leading-6 text-white/58">{selected?.description ?? "يتم عرض العلاقات المباشرة فقط."}</p>
        </div>

        <MapGroup title="الأنظمة الداعمة" items={systems} type="System" onSelect={onSelect} />
        <MapGroup title="القدرات الداعمة" items={capabilities} type="Capability" onSelect={onSelect} />
      </div>
    </div>
  );
}

function MapGroup({ title, items, type, onSelect }: { title: string; items: RawNode[]; type: LayerType; onSelect: (id: string) => void }) {
  const visible = items.slice(0, 3);
  return (
    <div className="mx-auto w-full max-w-[190px]" dir="rtl">
      <p className="mb-3 text-xs font-semibold text-slate-500">{title}</p>
      <div className="space-y-3">
        {visible.length ? visible.map((item) => <MapRelationCard key={item.id} item={item} type={type} onSelect={onSelect} />) : <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-400 shadow-sm">لا توجد عناصر مباشرة.</div>}
        {items.length > 3 ? <button onClick={() => onSelect(items[3].id)} className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-400 transition hover:border-teal/30 hover:bg-white hover:text-teal">+{items.length - 3} عناصر أخرى</button> : null}
      </div>
    </div>
  );
}

function MapRelationCard({ item, type, onSelect }: { item: RawNode; type: LayerType; onSelect: (id: string) => void }) {
  const Icon = nodeIcon(type);
  const accent = {
    System: "border-r-blue-500/70",
    Capability: "border-r-teal/70",
    Project: "border-r-violet-500/70",
    KPI: "border-r-amber-500/70",
    Department: "border-r-emerald-500/70",
  }[type];
  return (
    <button onClick={() => onSelect(item.id)} className={`flex min-h-[74px] w-full items-center gap-2 rounded-xl border border-r-4 border-slate-200/80 bg-white p-3 text-right shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-teal/25 hover:bg-slate-50/50 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)] ${accent}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${layerStyles[type].icon}`}>
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 text-xs font-semibold leading-5 text-slate-950">{item.name}</span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-400">{localizeValue(item.label)}</span>
      </span>
    </button>
  );
}

function ImpactSummary({
  selected,
  upstream,
  downstream,
  byRawId,
  overlaps,
}: {
  selected?: RawNode;
  upstream: Set<string>;
  downstream: Set<string>;
  byRawId: Map<string, RawNode>;
  overlaps: RawEdge[];
}) {
  const upstreamNames = Array.from(upstream).map((id) => byRawId.get(id)?.name).filter((item): item is string => Boolean(item));
  const downstreamNames = Array.from(downstream).map((id) => byRawId.get(id)?.name).filter((item): item is string => Boolean(item));
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.055)]">
        <h4 className="text-base font-semibold text-slate-950">ملخص الأثر</h4>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          {selected
            ? `${selected.name} يرتبط مباشرة بـ ${upstreamNames.length + downstreamNames.length} عنصرًا. تظهر الخريطة العلاقات المباشرة فقط لتقليل الضوضاء.`
            : "اختر عنصرًا لعرض ملخص أثره المباشر."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SummaryBlock title="ما يدعمه" items={downstreamNames} />
          <SummaryBlock title="ما يعتمد عليه" items={upstreamNames} />
        </div>
      </div>
      <div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.055)]">
        <h4 className="text-base font-semibold text-slate-950">أهم التوصيات</h4>
        <div className="mt-3 space-y-2 text-sm leading-7 text-slate-500">
          <p>راجع العلاقات قبل قرار الدمج أو الإيقاف أو إعادة توزيع الملكية.</p>
          <p>ابدأ بمعالجة التداخلات الحرجة والقدرات غير المغطاة.</p>
          <p>{overlaps.length ? `يوجد ${overlaps.length} تداخل مباشر يحتاج قرارًا معماريًا.` : "لا توجد تداخلات مباشرة ظاهرة لهذا العنصر."}</p>
        </div>
      </div>
    </section>
  );
}

function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-2 space-y-1">
        {items.length ? items.slice(0, 4).map((item) => <p key={item} className="truncate text-xs leading-6 text-slate-500">{item}</p>) : <p className="text-xs text-slate-400">لا توجد عناصر مباشرة.</p>}
      </div>
    </div>
  );
}

function InsightsBar({ insights }: { insights: ReturnType<typeof computeInsights> }) {
  return (
    <div className="grid gap-2.5 border-b border-slate-100 bg-white px-4 py-3 md:grid-cols-5">
      <InsightCard label="عدد التداخلات العالية" value={insights.highOverlaps} tone="rose" />
      <InsightCard label="القدرات بدون مالك" value={insights.orphanCapabilities} tone="amber" />
      <InsightCard label="الأنظمة عالية الاعتماد" value={insights.highDependencySystems} tone="teal" />
      <InsightCard label="المشاريع عالية التأثير" value={insights.highImpactProjects} tone="blue" />
      <InsightCard label="مؤشرات الأداء المتأثرة" value={insights.impactedKpis} tone="slate" />
    </div>
  );
}

function StoryPanel({ mode, selected, insights }: { mode: ViewMode; selected?: RawNode; insights: ReturnType<typeof computeInsights> }) {
  const title =
    mode === "executive"
      ? "القصة التنفيذية"
      : mode === "capability"
        ? "تحقيق أثر القدرة"
        : mode === "overlap"
          ? "تحقيق التداخل"
          : "مسار المشاريع";
  const narrative =
    selected
      ? `التركيز الحالي على ${selected.name}. تعرض اللوحة فقط مسار العلاقات الأكثر صلة، مع إخفاء الضوضاء المؤسسية غير المباشرة.`
      : mode === "executive"
        ? "ابدأ من القدرات الأعلى أثرًا والأنظمة الحرجة ومؤشرات الاعتماد. اختر عنصرًا لفتح تحقيق سياقي."
        : mode === "overlap"
          ? "يركز هذا المنظور على العلاقات ذات الازدواجية العالية، والكيانات التي تحتاج قرارًا معماريًا."
          : mode === "transformation"
            ? "يعرض هذا المنظور المشاريع المرتبطة والأنظمة والقدرات المتأثرة بها."
            : "اختر قدرة مؤسسية لعرض مالكها وأنظمتها ومشاريعها ومؤشراتها ذات الصلة.";
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-slate-950 p-4 text-white shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
      <p className="text-[11px] font-medium text-white/45">ملخص العلاقات</p>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-white/70">{narrative}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <StoryMetric label="تداخلات عالية" value={insights.highOverlaps} />
        <StoryMetric label="قدرات بلا مالك" value={insights.orphanCapabilities} />
        <StoryMetric label="أنظمة حرجة" value={insights.highDependencySystems} />
        <StoryMetric label="مشاريع مؤثرة" value={insights.highImpactProjects} />
      </div>
      <div className="mt-4 rounded-2xl bg-white/7 p-3">
        <p className="text-xs font-semibold text-white/80">التوصية</p>
        <p className="mt-1 text-xs leading-6 text-white/55">
          {selected ? "راجع الاعتماديات المباشرة قبل اتخاذ قرار دمج أو إيقاف أو إعادة إسناد الملكية." : "ابدأ بسؤال: ما القدرة أو النظام الذي يغير القرار التنفيذي القادم؟"}
        </p>
      </div>
    </section>
  );
}

function StoryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
      <p className="text-[10px] text-white/45">{label}</p>
      <p className="mt-1 text-xl font-semibold ltr">{value}</p>
    </div>
  );
}

function RightControlPanel({
  densityMode,
  setDensityMode,
  visibleLayers,
  setVisibleLayers,
  relationshipTypes,
  typeFilter,
  setTypeFilter,
  relationshipFilter,
  setRelationshipFilter,
}: {
  densityMode: DensityMode;
  setDensityMode: (mode: DensityMode) => void;
  visibleLayers: Record<LayerType, boolean>;
  setVisibleLayers: Dispatch<SetStateAction<Record<LayerType, boolean>>>;
  relationshipTypes: string[];
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  relationshipFilter: string;
  setRelationshipFilter: (value: string) => void;
}) {
  return (
    <aside className="grid content-start gap-4">
      <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)]">
        <p className="text-sm font-semibold text-slate-950">طبقات السياق</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">أظهر فقط ما يخدم التحقيق الحالي.</p>
        <div className="mt-4 grid gap-2">
          {layerOrder.map((type) => {
            const Icon = nodeIcon(type);
            return (
              <button
                key={type}
                onClick={() => setVisibleLayers((current) => ({ ...current, [type]: !current[type] }))}
                className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition ${
                  visibleLayers[type] ? "border-slate-200 bg-white text-slate-800 shadow-sm" : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-xl ${layerStyles[type].icon}`}>
                    <Icon size={14} />
                  </span>
                  <span className="font-medium">{layerLabels[type]}</span>
                </span>
                <span className={`h-2.5 w-2.5 rounded-full ${visibleLayers[type] ? "bg-teal" : "bg-slate-300"}`} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)]">
        <p className="text-sm font-semibold text-slate-950">كثافة المسار</p>
        <div className="mt-3 grid grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {(Object.keys(densityLabels) as DensityMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setDensityMode(mode)}
              className={`rounded-xl py-2 text-[11px] font-semibold transition ${densityMode === mode ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}
            >
              {densityLabels[mode]}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          <Field label="العناصر المؤسسية">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal">
              <option value="all">{ar.graph.all}</option>
              {layerOrder.map((type) => (
                <option key={type} value={type}>
                  {layerLabels[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="مسار العلاقات">
            <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal">
              <option value="all">{ar.graph.all}</option>
              {relationshipTypes.map((type) => (
                <option key={type} value={type}>
                  {localizeValue(type)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <LegendPanel relationshipTypes={relationshipTypes.slice(0, 7)} />
    </aside>
  );
}

function InsightCard({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "teal" | "blue" | "slate" }) {
  const toneClass = {
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    teal: "bg-teal/10 text-teal border-teal/10",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  }[tone];
  return (
    <div className={`rounded-2xl border px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.035)] ${toneClass}`}>
      <p className="text-[10px] font-medium leading-5 opacity-75">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold ltr">{value}</p>
    </div>
  );
}

function LayerBands({ height }: { height: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div dir="ltr" className="flex h-full min-w-[1500px] flex-row gap-7 px-10 py-8">
        {layerOrder.map((type) => {
          const style = layerStyles[type];
          return (
            <div key={type} className="h-full w-[238px] shrink-0 rounded-[26px] border border-slate-200/50 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" style={{ minHeight: height, background: style.band }}>
              <div className="px-4 py-4">
                <p className="text-sm font-semibold" style={{ color: style.text }}>
                  {layerLabels[type]}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{layerHints[type]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InspectorPanel({
  selected,
  edges,
  byRawId,
  connectedByType,
  upstream,
  downstream,
}: {
  selected?: RawNode;
  edges: RawEdge[];
  byRawId: Map<string, RawNode>;
  connectedByType: (type: LayerType) => RawNode[];
  upstream: Set<string>;
  downstream: Set<string>;
}) {
  const upstreamItems = Array.from(upstream).map((id) => byRawId.get(id)?.name).filter((item): item is string => Boolean(item));
  const downstreamItems = Array.from(downstream).map((id) => byRawId.get(id)?.name).filter((item): item is string => Boolean(item));
  const possibleOverlaps = edges.filter((edge) => edge.relationship === "overlaps_with").map((edge) => byRawId.get(edge.source === selected?.id ? edge.target : edge.source)?.name ?? "");
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)]">
      <h3 className="text-sm font-semibold text-slate-950">لوحة الفحص التنفيذي</h3>
      {!selected ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-500">
          اختر عقدة من اللوحة لعرض مسار التأثير والعلاقات المباشرة والأنظمة والمشاريع والمؤشرات المرتبطة.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <StatusBadge tone={selected.label === "Project" ? "rose" : selected.label === "System" ? "gold" : "teal"}>{localizeValue(selected.label)}</StatusBadge>
            <InfoLine label="اسم العنصر" value={selected.name} strong />
            <InfoLine label="النوع" value={localizeValue(selected.label)} />
            <InfoLine label="الوصف" value={selected.description ?? "لا يوجد وصف تفصيلي متاح لهذا العنصر."} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="عدد العلاقات" value={edges.length} />
            <Stat label="مستوى الأولوية" textValue={getRisk(selected, edges)} />
          </div>
          <InfoList title="العلاقات المباشرة" items={edges.map((edge) => `${localizeValue(edge.relationship)}: ${byRawId.get(edge.source === selected.id ? edge.target : edge.source)?.name ?? ""}`)} />
          <InfoList title="الجهات المتأثرة" items={upstreamItems.concat(downstreamItems).slice(0, 8)} />
          <InfoList title="القدرات المرتبطة" items={connectedByType("Capability").map((node) => node.name)} />
          <InfoList title="الجهات المرتبطة" items={connectedByType("Department").map((node) => node.name)} />
          <InfoList title="الأنظمة الداعمة" items={connectedByType("System").map((node) => node.name)} />
          <InfoList title="المشاريع المرتبطة" items={connectedByType("Project").map((node) => node.name)} />
          <InfoList title="مؤشرات الأداء المرتبطة" items={connectedByType("KPI").map((node) => node.name)} />
          <InfoList title="التداخلات المحتملة" items={possibleOverlaps.filter(Boolean)} />
          <InfoList title="اعتماديات قبلية" items={upstreamItems} />
          <InfoList title="اعتماديات لاحقة" items={downstreamItems} />
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="font-semibold">ملخص تنفيذي للأثر</p>
            <p className="mt-2 text-sm leading-7 text-white/70">
              يؤثر هذا العنصر في {downstreamItems.length} عنصرًا لاحقًا ويرتبط بـ {upstreamItems.length} عنصرًا قبليًا. استخدم تحليل الأثر لتتبع المسار الكامل من المالك إلى المؤشر التنفيذي.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function StatsPanel({ stats, overlapCount }: { stats: { totalNodes: number; totalRelationships: number; capabilityCount: number; systemsCount: number }; overlapCount: number }) {
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)]">
      <h3 className="text-sm font-semibold text-slate-950">{ar.graph.statistics}</h3>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Stat label={ar.graph.totalNodes} value={stats.totalNodes} />
        <Stat label={ar.graph.totalRelationships} value={stats.totalRelationships} />
        <Stat label={ar.graph.capabilityCount} value={stats.capabilityCount} />
        <Stat label={ar.graph.systemsCount} value={stats.systemsCount} />
        <Stat label={ar.graph.overlapCount} value={overlapCount} />
      </div>
    </section>
  );
}

function LegendPanel({ relationshipTypes }: { relationshipTypes: string[] }) {
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)]">
      <h3 className="text-sm font-semibold text-slate-950">دليل اللوحة</h3>
      <div className="mt-4 space-y-2.5">
        {layerOrder.map((type) => (
          <LegendRow key={type} label={layerLabels[type]} color={layerStyles[type].mini} />
        ))}
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-semibold text-slate-500">أنواع العلاقات</p>
        <div className="space-y-2.5">
          {relationshipTypes.map((type) => (
            <LegendRow key={type} label={localizeValue(type)} color={relationshipColors[type] ?? "#64748b"} thin />
          ))}
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function CanvasButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-9 rounded-xl px-3 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950">
      {children}
    </button>
  );
}

function CanvasIconButton({ children, onClick, title }: { children: ReactNode; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal hover:text-teal">
      {children}
    </button>
  );
}

function Stat({ label, value, textValue }: { label: string; value?: number; textValue?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950 ltr">{textValue ?? value}</p>
    </div>
  );
}

function InfoLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className={`${strong ? "text-lg leading-7" : "text-sm leading-7"} mt-1 font-semibold text-slate-950`}>{value}</p>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-950">{title}</p>
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <span key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600 ring-1 ring-slate-200/70">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">لا توجد عناصر مباشرة.</p>
      )}
    </div>
  );
}

function LegendRow({ label, color, thin = false }: { label: string; color: string; thin?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className={`${thin ? "h-1" : "h-2.5"} w-10 rounded-full`} style={{ background: color }} />
    </div>
  );
}

function NodeFlag({ children, tone }: { children: ReactNode; tone: "rose" | "amber" | "green" }) {
  const cls = tone === "rose" ? "bg-rose-50 text-rose-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}
