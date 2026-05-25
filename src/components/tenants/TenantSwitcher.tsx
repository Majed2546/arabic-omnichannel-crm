import { useTenant } from '../../tenants/useTenant'
import { useAuth } from '../../auth/useAuth'
import { AppSelect } from '../ui/AppSelect'

export function TenantSwitcher() {
  const { tenants, currentTenantId, setCurrentTenantId, canAccessTenant } = useTenant()
  const { user } = useAuth()
  const canSwitchTenant = user?.platformRole === 'SUPER_ADMIN' || user?.roles?.includes('local-admin')

  if (!canSwitchTenant) return null

  return (
    <label className="topbar-control tenant-switcher control-safe">
      <span>المستأجر</span>
      <AppSelect
        value={currentTenantId ?? ''}
        onChange={(event) => setCurrentTenantId(event.target.value)}
        aria-label="اختيار المستأجر الحالي"
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id} disabled={!canAccessTenant(tenant.id)}>
            {tenant.name}
          </option>
        ))}
      </AppSelect>
    </label>
  )
}
