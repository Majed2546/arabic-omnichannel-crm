"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { ar } from "@/lib/i18n";

const pageTitles: Record<string, string> = {
  "/": ar.nav.dashboard,
  "/upload": ar.nav.upload,
  "/review": ar.nav.review,
  "/capability-map": ar.nav.capabilityMap,
  "/overlaps": ar.nav.overlaps,
  "/graph": ar.nav.capabilityMap,
  "/admin": ar.nav.admin,
};

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="type-page-title mt-1 text-ink">{pageTitles[pathname] ?? ar.app.product}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal hover:text-teal" title={ar.app.notifications}>
            <Bell size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
