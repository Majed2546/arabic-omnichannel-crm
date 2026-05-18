import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  primary = false,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const className = primary
    ? "border-teal/15 bg-gradient-to-br from-emerald-50 via-white to-teal/10 text-ink shadow-[0_14px_34px_rgba(15,118,110,0.10)] ring-1 ring-teal/10 hover:border-teal/25 hover:shadow-[0_18px_44px_rgba(15,118,110,0.14)]"
    : "border-slate-200 bg-white text-ink shadow-soft hover:border-teal/40";
  const content = (
    <>
      <div className={`grid shrink-0 place-items-center rounded-2xl ${primary ? "h-10 w-10 bg-teal/10 text-teal shadow-sm" : "h-11 w-11 bg-teal/10 text-teal"}`}>
        <Icon size={primary ? 18 : 21} className={primary ? "opacity-85" : undefined} />
      </div>
      <div className="min-w-0">
        <p className={`${primary ? "text-[18px] font-semibold leading-8 text-ink" : "type-card-title"}`}>{title}</p>
        <p className={`mt-1 text-ui-sm ${primary ? "text-slate-600" : "text-slate-500"}`}>{description}</p>
      </div>
    </>
  );
  if (href) {
    return <Link href={href} className={`flex gap-3 rounded-[22px] border transition duration-200 hover:-translate-y-0.5 ${primary ? "px-4 py-3.5" : "p-4"} ${className}`}>{content}</Link>;
  }
  return <button onClick={onClick} type="button" className={`flex w-full gap-3 rounded-[22px] border text-right transition duration-200 hover:-translate-y-0.5 ${primary ? "px-4 py-3.5" : "p-4"} ${className}`}>{content}</button>;
}
