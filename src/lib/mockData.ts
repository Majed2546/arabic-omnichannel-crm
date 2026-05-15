import { DEFAULT_TENANT_ID, TENANTS } from '../tenants/tenantRegistry'
import { isTenantScopedRecord } from '../tenants/tenantUtils'
import type { TenantScoped } from '../tenants/tenantTypes'

export type Tenant = {
  id: string
  name: string
  plan: string
  status: string
  contacts: number
}

export type User = {
  id: string
  name: string
  role: string
  tenant: string
  status: string
}

export type Role = {
  id: string
  name: string
  permissions: string[]
}

export type Channel = {
  id: string
  type: string
  label: string
  status: string
  lastActive: string
}

export type InboxThread = {
  id: string
  title: string
  channel: string
  unread: number
  lastMessage: string
  time: string
}

type MockCompany = TenantScoped & {
  id: string
  name: string
  status: string
  industry: string
  employees: number
}

type MockPerson = TenantScoped & {
  id: string
  name: string
  role: string
  status: string
  email: string
}

type MockOpportunity = TenantScoped & {
  id: string
  name: string
  status: string
  stage: string
  amount: number
  closeDate: string
}

type MockTask = TenantScoped & {
  id: string
  title: string
  status: string
  dueDate: string
  assignee: string
}

type MockChannel = TenantScoped & Channel
type MockInboxThread = TenantScoped & InboxThread

const companies: MockCompany[] = [
  { tenant_id: 't-1', id: 'c-t1-1', name: 'شركة الرؤيا', status: 'نشطة', industry: 'التكنولوجيا', employees: 42 },
  { tenant_id: 't-1', id: 'c-t1-2', name: 'رؤيا للتجارة', status: 'نشطة', industry: 'التجارة الإلكترونية', employees: 26 },
  { tenant_id: 't-2', id: 'c-t2-1', name: 'نماء للحلول', status: 'نشطة', industry: 'الخدمات', employees: 18 },
  { tenant_id: 't-2', id: 'c-t2-2', name: 'نماء للعناية', status: 'نشطة', industry: 'الصحة', employees: 12 },
  { tenant_id: 't-3', id: 'c-t3-1', name: 'سحاب للخدمات', status: 'تعليق', industry: 'اللوجستيات', employees: 7 },
]

const people: MockPerson[] = [
  { tenant_id: 't-1', id: 'u-t1-1', name: 'ليلى الحسن', role: 'مشرف الدعم', status: 'نشط', email: 'layla@roya.example' },
  { tenant_id: 't-1', id: 'u-t1-2', name: 'نهى علي', role: 'محلل بيانات', status: 'نشط', email: 'noha@roya.example' },
  { tenant_id: 't-2', id: 'u-t2-1', name: 'سعود السالم', role: 'منسق القنوات', status: 'نشط', email: 'saud@nama.example' },
  { tenant_id: 't-2', id: 'u-t2-2', name: 'ريم فهد', role: 'مشرف الدعم', status: 'نشط', email: 'reem@nama.example' },
  { tenant_id: 't-3', id: 'u-t3-1', name: 'عمر ناصر', role: 'مشغل واتساب', status: 'خامل', email: 'omar@sahab.example' },
]

const opportunities: MockOpportunity[] = [
  { tenant_id: 't-1', id: 'o-t1-1', name: 'ترقية خطة المؤسسة', status: 'Open', stage: 'Negotiation', amount: 72000, closeDate: '2026-06-12' },
  { tenant_id: 't-1', id: 'o-t1-2', name: 'تحسين تجربة العملاء', status: 'Open', stage: 'Proposal', amount: 15000, closeDate: '2026-07-03' },
  { tenant_id: 't-2', id: 'o-t2-1', name: 'حل دعم التجارة الإلكترونية', status: 'Closed', stage: 'Won', amount: 34000, closeDate: '2026-05-28' },
  { tenant_id: 't-2', id: 'o-t2-2', name: 'أتمتة الردود', status: 'Open', stage: 'Discovery', amount: 22000, closeDate: '2026-06-18' },
  { tenant_id: 't-3', id: 'o-t3-1', name: 'إعادة تفعيل الاشتراك', status: 'Open', stage: 'Qualification', amount: 9000, closeDate: '2026-06-30' },
]

const tasks: MockTask[] = [
  { tenant_id: 't-1', id: 'k-t1-1', title: 'مراجعة رسالة العميل', status: 'Pending', dueDate: 'اليوم', assignee: 'ليلى الحسن' },
  { tenant_id: 't-1', id: 'k-t1-2', title: 'تحديث صلاحيات دور', status: 'Completed', dueDate: 'أمس', assignee: 'نهى علي' },
  { tenant_id: 't-2', id: 'k-t2-1', title: 'إعداد قناة واتساب', status: 'Pending', dueDate: 'الغد', assignee: 'سعود السالم' },
  { tenant_id: 't-2', id: 'k-t2-2', title: 'مراجعة قالب الردود', status: 'Pending', dueDate: 'اليوم', assignee: 'ريم فهد' },
  { tenant_id: 't-3', id: 'k-t3-1', title: 'مراجعة حالة الفوترة', status: 'Pending', dueDate: 'هذا الأسبوع', assignee: 'عمر ناصر' },
]

const channels: MockChannel[] = [
  { tenant_id: 't-1', id: 'ch-t1-1', type: 'WhatsApp', label: 'واتساب الرؤيا', status: 'متصل', lastActive: 'قبل دقيقة' },
  { tenant_id: 't-1', id: 'ch-t1-2', type: 'Instagram', label: 'إنستغرام الرؤيا', status: 'متصل', lastActive: 'قبل 35 دقيقة' },
  { tenant_id: 't-2', id: 'ch-t2-1', type: 'WhatsApp', label: 'واتساب نماء', status: 'متصل', lastActive: 'قبل 8 دقائق' },
  { tenant_id: 't-2', id: 'ch-t2-2', type: 'Twitter', label: 'تغريدات نماء', status: 'نشط', lastActive: 'قبل 12 دقيقة' },
  { tenant_id: 't-3', id: 'ch-t3-1', type: 'WhatsApp', label: 'واتساب سحاب', status: 'غير نشط', lastActive: 'قبل يومين' },
]

const inboxThreads: MockInboxThread[] = [
  { tenant_id: 't-1', id: 'm-t1-1', title: 'استفسار حول فاتورة', channel: 'واتساب', unread: 2, lastMessage: 'مرحباً، هل يمكنني الحصول على نسخة من الفاتورة؟', time: 'قبل 3 دقائق' },
  { tenant_id: 't-1', id: 'm-t1-2', title: 'استعلام عن المنتج', channel: 'إنستغرام', unread: 1, lastMessage: 'هل يتوفر هذا المنتج بلون أزرق؟', time: 'قبل ساعة' },
  { tenant_id: 't-2', id: 'm-t2-1', title: 'طلب دعم فني', channel: 'تويتر', unread: 0, lastMessage: 'لا يمكنني تسجيل الدخول إلى حسابي.', time: 'قبل 22 دقيقة' },
  { tenant_id: 't-2', id: 'm-t2-2', title: 'تفعيل محادثة جديدة', channel: 'واتساب', unread: 3, lastMessage: 'نحتاج ربط الرقم الجديد اليوم.', time: 'قبل 9 دقائق' },
  { tenant_id: 't-3', id: 'm-t3-1', title: 'متابعة اشتراك', channel: 'واتساب', unread: 1, lastMessage: 'متى يمكن إعادة تفعيل الحساب؟', time: 'أمس' },
]

function stripTenantScope<T extends TenantScoped>(record: T): Omit<T, 'tenant_id'> {
  const { tenant_id, ...rest } = record
  void tenant_id
  return rest
}

function scopedData<T extends TenantScoped>(records: T[], tenantId: string | null) {
  const resolvedTenantId = tenantId ?? DEFAULT_TENANT_ID
  return records.filter((record) => isTenantScopedRecord(record, resolvedTenantId)).map(stripTenantScope)
}

export function getMockResponse(operationName: string, tenantId: string | null = DEFAULT_TENANT_ID) {
  switch (operationName) {
    case 'GetDashboardOverview':
      return {
        companies: scopedData(companies, tenantId).map(({ id, name, status }) => ({ id, name, status })),
        people: scopedData(people, tenantId).map(({ id, name, role, status }) => ({ id, name, role, status })),
        opportunities: scopedData(opportunities, tenantId).map(({ id, name, status, stage, amount }) => ({ id, name, status, stage, amount })),
        tasks: scopedData(tasks, tenantId).map(({ id, title, status, dueDate }) => ({ id, title, status, dueDate })),
      }

    case 'GetCompanies':
      return {
        companies: scopedData(companies, tenantId),
      }

    case 'GetPeople':
      return {
        people: scopedData(people, tenantId),
      }

    case 'GetOpportunities':
      return {
        opportunities: scopedData(opportunities, tenantId),
      }

    case 'GetTasks':
      return {
        tasks: scopedData(tasks, tenantId),
      }

    case 'GetTenants':
      return {
        tenants: TENANTS.map((tenant) => ({
          ...tenant,
          status: tenant.status === 'active' ? 'نشطة' : 'تعليق',
        })),
      }

    case 'GetUsers':
      return {
        users: scopedData(people, tenantId).map((person) => ({
          id: person.id,
          name: person.name,
          role: person.role,
          tenant: TENANTS.find((tenant) => tenant.id === tenantId)?.name ?? '',
          status: person.status,
        })),
      }

    case 'GetRoles':
      return {
        roles: [
          { id: 'r-1', name: 'مدير النظام', permissions: ['الوصول الكامل', 'إدارة المستخدمين', 'تخصيص القنوات'] },
          { id: 'r-2', name: 'مشرف دعم', permissions: ['قراءة التذاكر', 'إدارة المحادثات', 'منشورات التسميات'] },
          { id: 'r-3', name: 'مشغل واتساب', permissions: ['قراءة الرسائل', 'إرسال الردود', 'عرض التقارير'] },
        ],
      }

    case 'GetChannels':
      return {
        channels: scopedData(channels, tenantId),
      }

    case 'GetInboxThreads':
      return {
        inboxThreads: scopedData(inboxThreads, tenantId),
      }

    case 'GetWhatsAppOnboarding':
      return {
        whatsappOnboarding: {
          connected: false,
          tasks: [
            'إعداد رقم واتساب تجاري',
            'ربط القناة مع CRM',
            'تدريب فريق الدعم',
          ],
        },
      }

    default:
      return {}
  }
}
