import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ar, language } from "@/lib/i18n";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: ar.app.title,
  description: ar.app.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={language.code} dir={language.direction}>
      <body>{children}</body>
    </html>
  );
}
