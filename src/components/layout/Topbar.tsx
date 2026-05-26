import { useLocation } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'
import { useAuth } from '../../auth/useAuth'
import { TenantSwitcher } from '../tenants/TenantSwitcher'
import { LocalTestContextSwitcher } from '../tenants/LocalTestContextSwitcher'
import { useTenant } from '../../tenants/useTenant'
import { BackendStatusIndicator } from './BackendStatusIndicator'
import { TopbarControl } from '../ui/TopbarControl'
import { UserCard } from './UserCard'
import { AppButton } from '../ui/AppButton'
import { AppInput } from '../ui/AppInput'
import { NotificationCenter } from '../../features/notifications'
import { RealtimeHealthIndicator } from './RealtimeHealthIndicator'

const pageTitles: Record<string, string> = {
  '/': 'لوحة القيادة',
  '/dashboard': 'لوحة القيادة',
  '/tenants': 'المستشارون والوكلاء',
  '/users': 'المستخدمون',
  '/roles': 'الأدوار والصلاحيات',
  '/channels': 'القنوات',
  '/automation': 'الأتمتة',
  '/workflows': 'الأتمتة',
  '/reports': 'التقارير',
  '/billing': 'الاشتراكات والباقات',
  '/integrations/meta': 'إعدادات Meta',
  '/inbox': 'صندوق الوارد',
  '/activity': 'سجل النشاط',
  '/whatsapp': 'واتساب',
  '/platform': 'لوحة تحكم المنصة',
  '/platform/companies': 'الشركات المشتركة',
  '/platform/onboarding-requests': 'طلبات الاشتراك',
  '/platform/subscriptions': 'الاشتراكات والباقات',
  '/platform/usage': 'استخدام المنصة',
}

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  support: 'مشرف الدعم',
  analyst: 'محلل بيانات',
}

const pageSubtitles: Record<string, string> = {
  '/inbox': 'مساحة موحدة لمحادثات العملاء عبر القنوات.',
  '/platform': 'إدارة منصة SaaS والشركات المشتركة من منظور مالك المنصة.',
  '/platform/companies': 'أساس إدارة الشركات المستأجرة في نموذج SaaS.',
  '/platform/onboarding-requests': 'إدارة طلبات الشركات قبل إنشاء الاشتراك.',
  '/platform/subscriptions': 'تعريف الباقات وحدود الاشتراك لكل شركة.',
  '/platform/usage': 'مراقبة الاستهلاك الشهري وحدود المنصة.',
  '/reports': 'تقارير الأداء والاستخدام حسب الشركة والفترة الزمنية.',
  '/billing': 'جاهزية الاشتراكات وحدود الاستخدام دون دفع إلكتروني.',
  '/integrations/meta': 'إعدادات مالك المنصة لتطبيق Meta و Embedded Signup.',
}

export function Topbar() {
  const location = useLocation()
  const { isPanelOpen, setPanelOpen } = useUiStore()
  const { user, logout } = useAuth()
  const { currentTenant } = useTenant()

  return (
    <header className="topbar">
      <div className="topbar-title-row">
        <button
          type="button"
          className="icon-button"
          onClick={() => setPanelOpen(!isPanelOpen)}
          aria-label="فتح القائمة"
        >
          ☰
        </button>
        <div className="topbar-title">
          <p className="topbar-overline">{pageSubtitles[location.pathname] ?? 'مرحباً بك في منصة ذكاء بلا حدود · Unlimited Intelligence'}</p>
          <h1>{pageTitles[location.pathname] ?? 'لوحة القيادة'}</h1>
        </div>
      </div>

      <div className="topbar-controls-row">
        <AppInput
          className="topbar-control topbar-search"
          type="search"
          placeholder="ابحث عن عملاء، مستخدمين أو قنوات"
          aria-label="بحث"
        />
        <LocalTestContextSwitcher />
        <TenantSwitcher />
        <BackendStatusIndicator />
        <RealtimeHealthIndicator />
        <NotificationCenter />
        <TopbarControl className="tenant-chip card-safe">
          <small>الحساب الحالي</small>
          <strong className="text-safe">{currentTenant?.name ?? 'غير محدد'}</strong>
        </TopbarControl>
        <UserCard
          name={user?.name ?? 'ضيف'}
          roleLabel={roleLabels[user?.role ?? 'analyst']}
        />
        <AppButton className="topbar-control logout-button" variant="ghost" onClick={logout}>
          خروج
        </AppButton>
      </div>
    </header>
  )
}
