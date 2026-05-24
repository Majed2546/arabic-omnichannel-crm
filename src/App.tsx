import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts'
import {
  ChannelsPage,
  ActivityFeedPage,
  DashboardPage,
  IdentityIntegrationsPage,
  RolesPage,
  TenantsPage,
  UnifiedInboxPage,
  UsersPage,
  WhatsAppOnboardingPage,
  WorkflowsPage,
} from './modules'
import { LoginPage, RequireAuth, UnauthorizedPage } from './pages'
import { RequireTenant } from './tenants/RequireTenant'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<RequireTenant><DashboardPage /></RequireTenant>} />
        <Route path="dashboard" element={<RequireTenant><DashboardPage /></RequireTenant>} />
        <Route path="tenants" element={<RequireTenant><TenantsPage /></RequireTenant>} />
        <Route path="users" element={<RequireTenant><UsersPage /></RequireTenant>} />
        <Route path="roles" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['roles.view']}><RolesPage /></RequireAuth></RequireTenant>} />
        <Route path="identity" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']}><IdentityIntegrationsPage /></RequireAuth></RequireTenant>} />
        <Route path="channels" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'support']} requiredPermissions={['channels.view']}><ChannelsPage /></RequireAuth></RequireTenant>} />
        <Route path="workflows" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'analyst']} requiredPermissions={['automation.view']}><WorkflowsPage /></RequireAuth></RequireTenant>} />
        <Route path="inbox" element={<RequireTenant><UnifiedInboxPage /></RequireTenant>} />
        <Route path="activity" element={<RequireTenant><ActivityFeedPage /></RequireTenant>} />
        <Route path="whatsapp" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'support']} requiredPermissions={['channels.view']}><WhatsAppOnboardingPage /></RequireAuth></RequireTenant>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
