import { NavLink } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'
import { useAuth } from '../../auth/useAuth'
import type { AuthUserRole } from '../../auth/authTypes'

const navigation: Array<{ path: string; label: string; allowedRoles: AuthUserRole[] }> = [
  { path: '/', label: 'لوحة القيادة', allowedRoles: ['admin', 'support', 'analyst'] },
  { path: '/tenants', label: 'المستأجرون', allowedRoles: ['admin', 'support'] },
  { path: '/users', label: 'المستخدمون', allowedRoles: ['admin', 'support'] },
  { path: '/roles', label: 'الأدوار والصلاحيات', allowedRoles: ['admin'] },
  { path: '/channels', label: 'القنوات', allowedRoles: ['admin', 'support'] },
  { path: '/workflows', label: 'الأتمتة', allowedRoles: ['admin'] },
  { path: '/inbox', label: 'صندوق الوارد', allowedRoles: ['admin', 'support', 'analyst'] },
  { path: '/activity', label: 'سجل النشاط', allowedRoles: ['admin', 'support', 'analyst'] },
  { path: '/whatsapp', label: 'واتساب', allowedRoles: ['admin', 'support'] },
  { path: '/pplus-observations', label: 'ملاحظات P+', allowedRoles: ['admin', 'support', 'analyst'] },
]

export function Sidebar() {
  const { isPanelOpen, setPanelOpen } = useUiStore()
  const { canAccess, user, logout } = useAuth()

  return (
    <aside className={`sidebar ${isPanelOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">ذ</span>
        <div>
          <p>ذكاء بلا حدود</p>
          <small>Intelligence Without Limits</small>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
        {navigation
          .filter((item) => canAccess(item.allowedRoles))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setPanelOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
      </nav>
      <div className="sidebar-footer">
        <div>
          <p>{user?.name ?? 'ضيف'}</p>
          <small>{user?.role === 'admin' ? 'مدير النظام' : user?.role === 'support' ? 'مشرف الدعم' : 'محلل بيانات'}</small>
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
