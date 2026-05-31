import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  Cable,
  CalendarDays,
  Clock3,
  ClipboardList,
  Gauge,
  Headset,
  Inbox,
  KeyRound,
  LayoutDashboard,
  PanelsTopLeft,
  MessageSquareText,
  ReceiptText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'
import { useAuth } from '../../auth/useAuth'
import { ROLE_LABELS } from '../../auth/permissions'
import type { AuthUserRole, CrmPermission } from '../../auth/authTypes'

const navigation: Array<{
  path: string
  label: string
  icon: LucideIcon
  allowedRoles: AuthUserRole[]
  permission: CrmPermission
  platformOnly?: boolean
}> = [
  { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard, allowedRoles: ['admin', 'support', 'analyst'], permission: 'dashboard.view' },
  { path: '/platform', label: 'لوحة تحكم المنصة', icon: PanelsTopLeft, allowedRoles: ['admin'], permission: 'settings.manage', platformOnly: true },
  { path: '/platform/companies', label: 'الشركات المشتركة', icon: Building2, allowedRoles: ['admin'], permission: 'settings.manage', platformOnly: true },
  { path: '/platform/onboarding-requests', label: 'طلبات الاشتراك', icon: ClipboardList, allowedRoles: ['admin'], permission: 'settings.manage', platformOnly: true },
  { path: '/billing', label: 'الاشتراكات والباقات', icon: ReceiptText, allowedRoles: ['admin', 'analyst'], permission: 'billing.view' },
  { path: '/platform/usage', label: 'استخدام المنصة', icon: Gauge, allowedRoles: ['admin'], permission: 'settings.manage', platformOnly: true },
  { path: '/inbox', label: 'صندوق الوارد', icon: Inbox, allowedRoles: ['admin', 'support', 'analyst'], permission: 'inbox.view' },
  { path: '/customers', label: 'العملاء', icon: Users, allowedRoles: ['admin', 'support', 'analyst'], permission: 'customers.view' },
  { path: '/appointments', label: 'المواعيد والتقويم', icon: CalendarDays, allowedRoles: ['admin', 'support', 'analyst'], permission: 'appointments.view' },
  { path: '/meetings', label: 'الاجتماعات المرئية', icon: Video, allowedRoles: ['admin', 'support', 'analyst'], permission: 'meetings.view' },
  { path: '/tickets', label: 'التذاكر', icon: Ticket, allowedRoles: ['admin', 'support', 'analyst'], permission: 'tickets.view' },
  { path: '/notifications', label: 'الإشعارات', icon: Bell, allowedRoles: ['admin', 'support', 'analyst'], permission: 'notifications.view' },
  { path: '/channels', label: 'القنوات', icon: Cable, allowedRoles: ['admin', 'support', 'analyst'], permission: 'channels.view' },
  { path: '/templates', label: 'القوالب والردود', icon: MessageSquareText, allowedRoles: ['admin', 'support', 'analyst'], permission: 'templates.view' },
  { path: '/bot', label: 'وكيل واتساب الذكي', icon: Bot, allowedRoles: ['admin', 'support'], permission: 'bot.view' },
  { path: '/users', label: 'المستخدمون', icon: Users, allowedRoles: ['admin'], permission: 'users.view' },
  { path: '/teams', label: 'الفرق', icon: Headset, allowedRoles: ['admin', 'support', 'analyst'], permission: 'users.view' },
  { path: '/tenants', label: 'المستشارون والوكلاء', icon: Headset, allowedRoles: ['admin', 'support', 'analyst'], permission: 'users.view' },
  { path: '/automation', label: 'الأتمتة', icon: Bot, allowedRoles: ['admin', 'analyst'], permission: 'automation.view' },
  { path: '/reports', label: 'التقارير', icon: BarChart3, allowedRoles: ['admin', 'analyst'], permission: 'reports.view' },
  { path: '/sla', label: 'SLA والتصعيد', icon: Clock3, allowedRoles: ['admin', 'support', 'analyst'], permission: 'reports.view' },
  { path: '/roles', label: 'الأدوار والصلاحيات', icon: ShieldCheck, allowedRoles: ['admin'], permission: 'roles.view' },
  { path: '/identity', label: 'إدارة الهوية والتكاملات', icon: KeyRound, allowedRoles: ['admin'], permission: 'settings.manage' },
  { path: '/integrations/meta', label: 'إعدادات Meta', icon: KeyRound, allowedRoles: ['admin'], permission: 'settings.manage', platformOnly: true },
  { path: '/settings', label: 'الإعدادات', icon: Settings, allowedRoles: ['admin'], permission: 'settings.view' },
]

export function Sidebar() {
  const { isPanelOpen, setPanelOpen } = useUiStore()
  const { canAccess, can, user, logout } = useAuth()
  const canAccessPlatform = user?.platformRole === 'SUPER_ADMIN' || user?.roles?.includes('local-admin')

  return (
    <aside className={`sidebar ${isPanelOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark official-logo-mark">
          <img src="/brand-logo.png" alt="ذكاء بلا حدود" />
        </span>
        <div>
          <p>ذكاء بلا حدود</p>
          <small>Unlimited Intelligence</small>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
        {navigation
          .filter((item) => (!item.platformOnly || canAccessPlatform) && canAccess(item.allowedRoles) && can(item.permission))
          .map((item) => {
            const Icon = item.icon
            return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setPanelOpen(false)}
            >
              <span className="sidebar-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
            )
          })}
      </nav>
      <div className="sidebar-footer">
        <div>
          <p>{user?.name ?? 'ضيف'}</p>
          <small>{user ? ROLE_LABELS[user.role] : 'زائر'}</small>
        </div>
        <button type="button" className="secondary-button" onClick={logout}>
          تسجيل الخروج
        </button>
      </div>
      <button
        type="button"
        className="sidebar-close"
        onClick={() => setPanelOpen(false)}
        aria-label="إغلاق القائمة"
      >
        ×
      </button>
      <div
        className={`sidebar-backdrop ${isPanelOpen ? 'visible' : ''}`}
        onClick={() => setPanelOpen(false)}
      />
    </aside>
  )
}
