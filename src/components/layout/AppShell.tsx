import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { RightSidebar } from './RightSidebar'
import { Topbar } from './Topbar'
import { ToastViewport } from '../ui/ToastViewport'
import { useNotificationRealtime } from '../../features/notifications'
import { useRealtime } from '../../modules/realtime'

export function AppShell() {
  useRealtime()
  useNotificationRealtime()

  return (
    <div className="app-shell">
      <Sidebar />
      <section className="app-main">
        <Topbar />
        <div className="app-content">
          <Outlet />
        </div>
      </section>
      <RightSidebar />
      <ToastViewport />
    </div>
  )
}
