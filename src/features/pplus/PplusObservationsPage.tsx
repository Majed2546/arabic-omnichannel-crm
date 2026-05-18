import type { ReactNode } from 'react'

type ObservationStatus = 'covered' | 'confirm'

type Observation = {
  id: number
  title: string
  observation: string
  impact: string
  resolution: string
  status: ObservationStatus
}

type Category = {
  id: string
  title: string
  subtitle: string
  icon: ReactNode
  observations: Observation[]
}

const categories: Category[] = [
  {
    id: 'integration',
    title: 'التكامل مع الأنظمة الأخرى',
    subtitle: 'جاهزية الربط وتبادل البيانات مع منظومة الوزارة والأنظمة المالية.',
    icon: <NetworkIcon />,
    observations: [
      {
        id: 1,
        title: 'التكامل الآلي وواجهات APIs',
        observation: 'عدم قدرة النظام على الربط الآلي وتبادل البيانات مع الأنظمة القائمة نتيجة اختلاف البروتوكولات أو غياب الواجهات البرمجية.',
        impact: 'تعذر الربط مع نظام إدارة الاستراتيجية وERP، إدخال يدوي للبيانات، فجوة في الدقة، وصعوبة استخراج تقارير لحظية.',
        resolution: 'يوفر P+ إطار تكامل مفتوح عبر REST APIs قياسية، مع مزامنة مرنة وتكامل مع SAP / Oracle ERP والأنظمة الاستراتيجية الحكومية.',
        status: 'covered',
      },
    ],
  },
  {
    id: 'ux',
    title: 'تجربة المستخدم',
    subtitle: 'تبسيط الواجهات، توحيد مصدر البيانات، وتحسين إنتاجية المستخدمين.',
    icon: <ExperienceIcon />,
    observations: [
      {
        id: 2,
        title: 'واجهة موحدة واحترافية',
        observation: 'واجهات رسومية غير احترافية وضبابية في مصدر المعلومات وآلية التعديل بين النظام وPower BI وSharePoint.',
        impact: 'منحنى تعلم صعب وتشتت في تحديد مصدر البيانات والمسؤول عن تحديثها.',
        resolution: 'يوفر P+ واجهة موحدة احترافية مبنية على البطاقات، مع مصدر بيانات واحد مركزي دون الحاجة لأدوات خارجية.',
        status: 'covered',
      },
      {
        id: 3,
        title: 'لوحات أداء تفاعلية',
        observation: 'لوحات أداء غير تفاعلية ولا تدعم استعراض البيانات التفصيلية عبر Pop-Ups أو Drill-down.',
        impact: 'لوحات أداء غير فعالة لا تدعم القرار التنفيذي.',
        resolution: 'يدعم P+ لوحات تفاعلية مع Drill-down ونوافذ منبثقة وربط متعدد الأبعاد، إضافة إلى Dashboard Builder دون مطور.',
        status: 'covered',
      },
      {
        id: 4,
        title: 'تصدير التقارير ومعاينتها',
        observation: 'نموذج تصدير التقارير غير فعال، دون معاينة قبل التصدير أو فلاتر على مستوى التقرير.',
        impact: 'ضعف الاعتمادية على النظام، اللجوء للتقارير اليدوية، وتأخر إصدار التقارير.',
        resolution: 'يوفر P+ محرك تقارير Word وExcel وPDF مع معاينة وفلاتر وهوية بصرية وReport Builder وحوكمة إصدار ضمن SLAs.',
        status: 'covered',
      },
      {
        id: 5,
        title: 'محرك الجداول الزمنية',
        observation: 'الاعتمادية على Microsoft Project والتنقل بين الأنظمة لإدارة الجداول الزمنية.',
        impact: 'الحاجة لرخص MS Project إضافية وصلاحيات مزدوجة لإدارة خطط المشاريع.',
        resolution: 'يعمل P+ بمحرك جدول زمني داخلي يدعم Gantt وCPM وBaselines وResource Leveling مع استيراد .mpp وتصدير Excel/CSV.',
        status: 'covered',
      },
      {
        id: 6,
        title: 'إدارة صلاحيات مركزية',
        observation: 'إدارة الصلاحيات موزعة بين النظام وSharePoint.',
        impact: 'ضبابية في إدارة الصلاحيات ومنحنى تعلم معقد لمدراء النظام.',
        resolution: 'يوفر P+ وحدة Centralized Admin Console لإدارة الصلاحيات مركزياً مع RBAC كامل ومتدرج هرمياً.',
        status: 'covered',
      },
      {
        id: 7,
        title: 'صلاحيات واجهات مبنية على الدور',
        observation: 'عدم دعم Role-Based Permissions في إظهار عناصر الواجهات وعدم توارث صلاحيات المستويات العليا تلقائياً.',
        impact: 'ظهور تبويبات ثابتة لجميع المستخدمين، تشتيت الانتباه، وصعوبة منحنى التعلم.',
        resolution: 'يعرض P+ التبويبات والعناصر حسب صلاحية المستخدم فقط، مع توارث هرمي تلقائي للصلاحيات.',
        status: 'covered',
      },
      {
        id: 8,
        title: 'أرشفة المشاريع',
        observation: 'غياب آلية لأرشفة المشاريع المكتملة أو الملغاة.',
        impact: 'تضخم المشاريع المعروضة وصعوبة الوصول للمشاريع القائمة.',
        resolution: 'يوفر P+ أرشفة مرنة للمشاريع مع الاسترجاع والتصنيف حسب مكتمل أو ملغي أو مؤرشف.',
        status: 'covered',
      },
      {
        id: 9,
        title: 'مركز موحد للمهام',
        observation: 'غياب واجهة موحدة لإدارة المهام والمخاطر والتحديات الموكلة للموظف.',
        impact: 'تشتت الموظفين بين الواجهات وتأخر إنجاز المهام.',
        resolution: 'يوفر P+ Tasks Hub لعرض المهام المسندة، المهام التي أسندها المستخدم، الموافقات المطلوبة، وحالة الطلبات من الويب والجوال.',
        status: 'covered',
      },
      {
        id: 10,
        title: 'حفظ النماذج كمسودة / Auto Save',
        observation: 'لا توجد آلية لحفظ النماذج كمسودة لاستكمال العمل عليها لاحقاً.',
        impact: 'زيادة العبء على المستخدم في إعادة الإدخال وفقدان البيانات عند انتهاء الجلسة أو فقد الاتصال.',
        resolution: 'تم إدراج دعم Auto-Save على جميع نماذج الإنشاء ضمن قائمة التحقق في العرض الحي للمورد.',
        status: 'confirm',
      },
      {
        id: 11,
        title: 'مركز لوحات الأداء',
        observation: 'تبويبات لوحات الأداء تشغل واجهات متعددة على الصفحة الرئيسية.',
        impact: 'ارتباك المستخدم وصعوبة العثور على المعلومة المطلوبة.',
        resolution: 'يوفر P+ Dashboards Center يعرض فقط اللوحات المصرح للمستخدم بالوصول إليها بدلاً من تبويبات متفرقة.',
        status: 'covered',
      },
    ],
  },
  {
    id: 'sustainability',
    title: 'استدامة النظام',
    subtitle: 'قابلية التكوين والصيانة دون اعتماد مستمر على التطوير البرمجي.',
    icon: <SustainabilityIcon />,
    observations: [
      {
        id: 12,
        title: 'منصة Low-Code قابلة للتكوين',
        observation: 'النظام مبني على Hard-coding ويتطلب الرجوع للمطور لأي تغييرات بسيطة في الحقول أو الموافقات أو النماذج.',
        impact: 'بطء استجابة النظام لمتطلبات الأعمال المتغيرة وارتفاع تكلفة الصيانة والتطوير.',
        resolution: 'يوفر P+ منصة Low-Code تمكن مدير النظام من تعديل الحقول، بناء الموافقات، إنشاء النماذج، وتكوين الهياكل دون مطور.',
        status: 'covered',
      },
    ],
  },
  {
    id: 'business',
    title: 'متطلبات الأعمال',
    subtitle: 'مواءمة دورة حياة المشاريع مع سياسات الوزارة والحوكمة التشغيلية.',
    icon: <BusinessIcon />,
    observations: [
      {
        id: 13,
        title: 'تركيز دورة حياة المشروع',
        observation: 'وجود Modules لا ترتبط جوهرياً بإدارة المشاريع مثل الأهداف والاجتماعات وإنجازات ومخاطر لوحات الأداء.',
        impact: 'إشغال الواجهات بعناصر فرعية وتعقيد تجربة المستخدم بعيداً عن الهدف الرئيسي.',
        resolution: 'P+ مصمم حول Project Lifecycle، والوحدات الإضافية اختيارية ويمكن تفعيلها أو تعطيلها حسب احتياج الإدارة.',
        status: 'covered',
      },
      {
        id: 14,
        title: 'قوالب متعددة لأنواع المشاريع',
        observation: 'تعميم مراحل المشتريات على جميع المشاريع دون مراعاة المشاريع صفرية القيمة أو التنفيذ الداخلي أو BAU أو البرامج الخاصة.',
        impact: 'قالب موحد لا ينسجم مع اختلاف طبيعة مشاريع الوزارة.',
        resolution: 'يدعم P+ Multi-Template Architecture لكل نوع مشروع، ولكل قالب مراحله وسياساته وموافقاته المستقلة.',
        status: 'covered',
      },
      {
        id: 15,
        title: 'هياكل مشاريع متعددة',
        observation: 'إتاحة هيكلية واحدة فقط للمشاريع لا تتواءم مع تعدد سياسات ومراحل الإدارات.',
        impact: 'تركيز مفرط على دورة حياة المشتريات وتقليل كفاءة تغطية جوانب تنفيذ المشاريع.',
        resolution: 'يتيح P+ Multiple Project Structures قابلة للتخصيص بالنماذج والمراحل والصلاحيات والحالات وسلاسل الموافقات.',
        status: 'covered',
      },
      {
        id: 16,
        title: 'ترابط منطقي لعناصر المشروع',
        observation: 'إنشاء العناصر على مستوى النظام دون ربطها بعناصر أخرى مثل عدم ارتباط فريق العمل بإسناد المهام.',
        impact: 'غياب الترابط المنطقي، تكرار الإدخال، وأخطاء في التتبع.',
        resolution: 'يوفر P+ Logical Data Model يربط فريق المشروع، إسناد المهام، الموافقات، والتتبع في تسلسل عمل واحد.',
        status: 'covered',
      },
      {
        id: 17,
        title: 'إلغاء وإيقاف المشاريع',
        observation: 'لا توجد آلية لإلغاء المشاريع أو إيقافها مؤقتاً.',
        impact: 'تضخم عدد المشاريع المتأخرة نتيجة الإيقاف الجزئي أو الإلغاء.',
        resolution: 'يدعم P+ حالات On Hold وCancelled وArchived وUnder Review مع أثر منطقي على لوحات الأداء.',
        status: 'covered',
      },
      {
        id: 18,
        title: 'المخرجات والمعالم الرئيسية',
        observation: 'لا يتيح النظام تبويب مخرجات المشروع أو المعالم الرئيسية.',
        impact: 'ضعف الرؤية الاستراتيجية وصعوبة استعراض تقدم المعالم والمخرجات.',
        resolution: 'يوفر P+ تبويبات Milestones وDeliverables مع أوزان أداء وربط بشهادة الإنجاز COC وآلية الدفع للموردين.',
        status: 'covered',
      },
      {
        id: 19,
        title: 'تصعيد المخاطر والتحديات',
        observation: 'لا توجد آلية لتصعيد المخاطر والتحديات التي تتجاوز صلاحية مدير المشروع.',
        impact: 'تأخر المهام، تفاقم المخاطر، ضعف الشفافية لدى متخذي القرار، وغياب وضوح الدعم المطلوب.',
        resolution: 'يوفر P+ Escalation Engine مع هيكلية تصعيد، SLA لكل مرحلة، تحويل المخاطر لتحديات، ربط بطلبات التغيير، وإشعارات تلقائية.',
        status: 'covered',
      },
      {
        id: 20,
        title: 'تحليل تأثير ترابط المشاريع',
        observation: 'لا توجد آلية تظهر ارتباطات المشاريع ببعضها ومدى التأثير المتبادل.',
        impact: 'صعوبة إدارة المحافظ والمشاريع المرتبطة وغياب الشفافية حول أثر المشروع على بقية المشاريع.',
        resolution: 'يوفر P+ Dependencies، ويوصى بالتحقق في العرض الحي من عمق Cascade Impact Analysis عند تأخر أحد المشاريع.',
        status: 'confirm',
      },
      {
        id: 21,
        title: 'تصنيف المحافظ والوكالات',
        observation: 'جميع المشاريع المسندة للمستخدم تظهر في صفحة واحدة دون تصنيف حسب الوكالات أو الإدارات العامة.',
        impact: 'صعوبة الوصول للمشاريع واستعراض أدائها وغياب لوحات أداء على مستوى الوكالات والإدارات.',
        resolution: 'يوفر P+ P3 Management مع تصنيف هرمي وبطاقات أداء لكل مستوى وتصفية وفرز حسب الحالة والأهمية.',
        status: 'covered',
      },
    ],
  },
]

const observations = categories.flatMap((category) => category.observations)
const totalObservations = observations.length
const coveredObservations = observations.filter((observation) => observation.status === 'covered').length
const confirmationObservations = observations.filter((observation) => observation.status === 'confirm').length
const coveredPercentage = Math.round((coveredObservations / totalObservations) * 100)

function StatusBadge({ status }: { status: ObservationStatus }) {
  const isCovered = status === 'covered'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
      isCovered
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    }`}>
      <span className={`h-2 w-2 rounded-full ${isCovered ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {isCovered ? 'مغطى Native' : 'يحتاج تأكيد في العرض الحي'}
    </span>
  )
}

function SummaryMetricCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'green' | 'amber' }) {
  const toneClasses = {
    blue: 'from-slate-900 to-blue-900 text-white',
    green: 'from-emerald-600 to-emerald-700 text-white',
    amber: 'from-amber-400 to-amber-500 text-slate-950',
  }

  return (
    <article className={`rounded-3xl bg-gradient-to-br ${toneClasses[tone]} p-6 shadow-lg shadow-slate-200/70`}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <strong className="mt-3 block text-5xl font-black leading-none">{value}</strong>
    </article>
  )
}

function ProgressCoverageBar() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-900">مؤشر التغطية الإجمالي</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">تمت تغطية {coveredObservations} من أصل {totalObservations} ملاحظة</h2>
        </div>
        <div className="rounded-2xl bg-slate-50 px-5 py-3 text-left">
          <span className="block text-3xl font-black text-emerald-600">{coveredPercentage}%</span>
          <small className="text-xs font-bold text-slate-500">نسبة التغطية</small>
        </div>
      </div>
      <div className="mt-6 h-5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        <div className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-600" style={{ width: `${coveredPercentage}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>مغطى بالكامل في P+</span>
        <span>{coveredObservations}/{totalObservations}</span>
      </div>
    </section>
  )
}

function ObservationCard({ observation }: { observation: Observation }) {
  const needsConfirmation = observation.status === 'confirm'

  return (
    <article className={`relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${
      needsConfirmation ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
    }`}>
      <div className={`absolute inset-y-0 right-0 w-1.5 ${needsConfirmation ? 'bg-amber-400' : 'bg-emerald-500'}`} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black ${
            needsConfirmation ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {observation.id}
          </span>
          <div>
            <p className="text-xs font-bold text-slate-400">رقم الملاحظة</p>
            <h3 className="mt-1 text-lg font-black leading-snug text-slate-950">{observation.title}</h3>
          </div>
        </div>
        <StatusBadge status={observation.status} />
      </div>

      <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">{observation.observation}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <InfoBlock title="الأثر على الأعمال" value={observation.impact} tone="blue" />
        <InfoBlock title="معالجة P+" value={observation.resolution} tone={needsConfirmation ? 'amber' : 'green'} />
      </div>
    </article>
  )
}

function InfoBlock({ title, value, tone }: { title: string; value: string; tone: 'blue' | 'green' | 'amber' }) {
  const marker = {
    blue: 'bg-blue-900',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${marker[tone]}`} />
        <strong className="text-sm text-slate-900">{title}</strong>
      </div>
      <p className="text-sm leading-7 text-slate-600">{value}</p>
    </div>
  )
}

function CategorySection({ category }: { category: Category }) {
  const covered = category.observations.filter((observation) => observation.status === 'covered').length

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-5 shadow-inner shadow-white">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-white text-blue-900 shadow-sm ring-1 ring-slate-200">
            {category.icon}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{category.observations.length} ملاحظات</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{category.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-500">{category.subtitle}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
          {covered}/{category.observations.length} مغطاة
        </div>
      </div>
      <div className="grid gap-4">
        {category.observations.map((observation) => (
          <ObservationCard key={observation.id} observation={observation} />
        ))}
      </div>
    </section>
  )
}

function NetworkIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 8.5h10M7 15.5h10M7.5 8.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM22.5 8.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM7.5 15.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM22.5 15.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function ExperienceIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5h16v11H4v-11ZM8 20h8M10 16.5 9 20M14 16.5l1 3.5M7.5 9h3.5M7.5 12.5h8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SustainabilityIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v4M12 17v4M4.2 7.5l3.4 2M16.4 14l3.4 2M19.8 7.5l-3.4 2M7.6 14l-3.4 2M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BusinessIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V8l8-4 8 4v12M8 20v-6h8v6M8 9.5h.01M12 9.5h.01M16 9.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PplusObservationsPage() {
  return (
    <main dir="rtl" className="min-h-screen rounded-[2rem] bg-[#f6f8fb] p-4 text-slate-900 md:p-8 print:rounded-none print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-200/80 md:p-10">
          <div className="absolute left-0 top-0 h-full w-2 bg-blue-900" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900 ring-1 ring-blue-100">تقييم نظام إدارة المشاريع · 2026</p>
              <h1 className="mt-6 text-3xl font-black leading-tight text-slate-950 md:text-5xl">ملاحظات فريق الوزارة على نظام MS EPM وآلية معالجتها في P+</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                لوحة تنفيذية تلخص 21 ملاحظة مصنفة حسب التكامل، تجربة المستخدم، استدامة النظام، ومتطلبات الأعمال، مع إبراز نقاط التحقق المطلوبة قبل التعاقد.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <p className="text-sm font-bold text-slate-500">قرار التغطية العام</p>
              <strong className="mt-2 block text-4xl font-black text-emerald-600">{coveredObservations}/{totalObservations}</strong>
              <span className="text-sm font-bold text-slate-500">مغطاة بالكامل في P+</span>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryMetricCard label="إجمالي الملاحظات" value={`${totalObservations}`} tone="blue" />
          <SummaryMetricCard label="مغطاة بالكامل في P+" value={`${coveredObservations}`} tone="green" />
          <SummaryMetricCard label="تحتاج تأكيد في العرض الحي" value={`${confirmationObservations}`} tone="amber" />
        </section>

        <div className="mt-6">
          <ProgressCoverageBar />
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {observations.filter((observation) => observation.status === 'confirm').map((observation) => (
            <article key={observation.id} className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-lg shadow-amber-100/60">
              <div className="flex items-center justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-xl font-black text-slate-950">{observation.id}</span>
                <StatusBadge status={observation.status} />
              </div>
              <h2 className="mt-4 text-xl font-black text-slate-950">{observation.title}</h2>
              <p className="mt-3 text-sm leading-7 text-amber-900">{observation.resolution}</p>
            </article>
          ))}
        </section>

        <div className="mt-8 grid gap-6">
          {categories.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>

        <section className="mt-8 rounded-[2.5rem] bg-blue-950 p-6 text-white shadow-xl shadow-slate-300/60 md:p-8">
          <p className="text-sm font-bold text-emerald-300">الخلاصة التنفيذية</p>
          <h2 className="mt-2 text-3xl font-black">P+ يغطي معظم ملاحظات الوزارة بشكل أصيل</h2>
          <p className="mt-4 max-w-5xl text-base leading-8 text-blue-50">
            يوضح التقييم أن نظام P+ يغطي 19 ملاحظة من أصل 21 ملاحظة تغطية Native عبر قدراته في التكامل، تجربة المستخدم، الاستدامة، ومتطلبات الأعمال.
            تبقى نقطتان بحاجة إلى تحقق مباشر في العرض الحي قبل التعاقد: حفظ النماذج كمسودة / Auto Save، وتحليل تأثير ترابط المشاريع / Cascade Impact Analysis.
            وبناءً على ذلك، يمكن اعتبار P+ مناسباً وظيفياً لمعظم احتياجات الوزارة، مع ربط قرار الترسية النهائي بإثبات هاتين النقطتين عملياً من المورد.
          </p>
        </section>
      </div>
    </main>
  )
}
