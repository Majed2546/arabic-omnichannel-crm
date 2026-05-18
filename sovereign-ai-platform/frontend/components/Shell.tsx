import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export function Shell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
