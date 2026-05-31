import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts'
import {
  ChannelsPage,
  AppointmentsPage,
  CustomersPage,
  ActivityFeedPage,
  BillingPage,
  DashboardPage,
  IdentityIntegrationsPage,
  MeetingsPage,
  MetaSettingsPage,
  PlatformCompaniesPage,
  PlatformDashboardPage,
  PlatformOnboardingRequestsPage,
  PlatformUsagePage,
  ReportsPage,
  RolesPage,
  SettingsPage,
  TemplatesPage,
  TicketsPage,
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
        <Route path="tenants" element={<RequireTenant><RequireAuth requiredPermissions={['users.view']}><UsersPage /></RequireAuth></RequireTenant>} />
        <Route path="users" element={<RequireTenant><RequireAuth requiredPermissions={['users.view']}><UsersPage /></RequireAuth></RequireTenant>} />
        <Route path="roles" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['roles.view']}><RolesPage /></RequireAuth></RequireTenant>} />
        <Route path="identity" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']}><IdentityIntegrationsPage /></RequireAuth></RequireTenant>} />
        <Route path="integrations/meta" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']} requirePlatformAdmin><MetaSettingsPage /></RequireAuth></RequireTenant>} />
        <Route path="channels" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'support']} requiredPermissions={['channels.view']}><ChannelsPage /></RequireAuth></RequireTenant>} />
        <Route path="automation" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'analyst']} requiredPermissions={['automation.view']}><WorkflowsPage /></RequireAuth></RequireTenant>} />
        <Route path="workflows" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'analyst']} requiredPermissions={['automation.view']}><WorkflowsPage /></RequireAuth></RequireTenant>} />
        <Route path="inbox" element={<RequireTenant><UnifiedInboxPage /></RequireTenant>} />
        <Route path="customers" element={<RequireTenant><RequireAuth requiredPermissions={['customers.view']}><CustomersPage /></RequireAuth></RequireTenant>} />
        <Route path="appointments" element={<RequireTenant><RequireAuth requiredPermissions={['appointments.view']}><AppointmentsPage /></RequireAuth></RequireTenant>} />
        <Route path="meetings" element={<RequireTenant><RequireAuth requiredPermissions={['meetings.view']}><MeetingsPage /></RequireAuth></RequireTenant>} />
        <Route path="tickets" element={<RequireTenant><RequireAuth requiredPermissions={['tickets.view']}><TicketsPage /></RequireAuth></RequireTenant>} />
        <Route path="templates" element={<RequireTenant><RequireAuth requiredPermissions={['templates.view']}><TemplatesPage /></RequireAuth></RequireTenant>} />
        <Route path="reports" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'analyst']} requiredPermissions={['reports.view']}><ReportsPage /></RequireAuth></RequireTenant>} />
        <Route path="billing" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'analyst']} requiredPermissions={['billing.view']}><BillingPage /></RequireAuth></RequireTenant>} />
        <Route path="settings" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'analyst']} requiredPermissions={['settings.view']}><SettingsPage /></RequireAuth></RequireTenant>} />
        <Route path="platform" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']} requirePlatformAdmin><PlatformDashboardPage /></RequireAuth></RequireTenant>} />
        <Route path="platform/companies" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']} requirePlatformAdmin><PlatformCompaniesPage /></RequireAuth></RequireTenant>} />
        <Route path="platform/onboarding-requests" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']} requirePlatformAdmin><PlatformOnboardingRequestsPage /></RequireAuth></RequireTenant>} />
        <Route path="platform/subscriptions" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']} requirePlatformAdmin><BillingPage /></RequireAuth></RequireTenant>} />
        <Route path="platform/usage" element={<RequireTenant><RequireAuth allowedRoles={['admin']} requiredPermissions={['settings.manage']} requirePlatformAdmin><PlatformUsagePage /></RequireAuth></RequireTenant>} />
        <Route path="activity" element={<RequireTenant><ActivityFeedPage /></RequireTenant>} />
        <Route path="whatsapp" element={<RequireTenant><RequireAuth allowedRoles={['admin', 'support']} requiredPermissions={['channels.view']}><WhatsAppOnboardingPage /></RequireAuth></RequireTenant>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
