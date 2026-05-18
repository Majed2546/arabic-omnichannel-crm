import { CheckCircle2, CircleDot, ShieldCheck } from "lucide-react";

const activities = [
  { title: "تم تحديث ملخص القدرات", meta: "بيانات القدرات الحالية", icon: CheckCircle2 },
  { title: "تم تحديث العلاقات المؤسسية", meta: "الأنظمة والإدارات والمشاريع", icon: CircleDot },
  { title: "مسار الاعتماد جاهز", meta: "مراجعة قبل النشر", icon: ShieldCheck },
];

export function ActivityTimeline() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activity.icon;
        return (
          <div key={activity.title} className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal/10 text-teal">
              <Icon size={18} />
            </div>
            <div className="min-w-0 border-b border-slate-100 pb-4">
              <p className="type-card-title">{activity.title}</p>
              <p className="type-meta mt-1">{activity.meta}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
