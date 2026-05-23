import { useLocation } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'
import { useAuth } from '../../auth/useAuth'
import { TenantSwitcher } from '../tenants/TenantSwitcher'
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
  '/tenants': 'المستأجرون',
  '/users': 'المستخدمون',
  '/roles': 'الأدوار والصلاحيات',
  '/channels': 'القنوات',
  '/workflows': 'الأتمتة',
  '/inbox': 'صندوق الوارد',
  '/activity': 'سجل النشاط',
  '/whatsapp': 'واتساب',
}

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  support: 'مشرف الدعم',
  analyst: 'محلل بيانات',
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
          <p className="topbar-overline">مرحباً بك في منصة ذكاء بلا حدود · Intelligence Without Limits</p>
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
