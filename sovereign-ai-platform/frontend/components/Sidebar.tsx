"use client";

import { BarChart3, Database, FileUp, GitFork, Home, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ar } from "@/lib/i18n";

const nav = [
  { href: "/", label: ar.nav.dashboard, icon: Home },
  { href: "/upload", label: ar.nav.upload, icon: FileUp },
  { href: "/review", label: ar.nav.review, icon: ShieldCheck },
  { href: "/capability-map", label: ar.nav.capabilityMap, icon: GitFork },
  { href: "/overlaps", label: ar.nav.overlaps, icon: BarChart3 },
  { href: "/admin", label: ar.nav.admin, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-80 overflow-hidden bg-gradient-to-b from-emeraldDeep via-teal to-emeraldNight text-white shadow-2xl lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_26rem)]" />
      <div className="relative border-b border-white/10 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 text-amber-200 ring-1 ring-white/15">
            <Database size={24} />
          </div>
          <div>
            <p className="type-meta font-semibold text-amber-100">{ar.app.brand}</p>
            <h1 className="type-card-title text-white">{ar.app.product}</h1>
          </div>
        </div>
      </div>
      <nav className="relative flex-1 space-y-4 p-4 pt-6">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`type-sidebar-nav flex items-center gap-4 rounded-2xl px-4 py-3.5 transition duration-200 ${
                active ? "bg-white text-emeraldDeep shadow-lg" : "text-white/85 hover:bg-white/12 hover:text-white"
              }`}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
