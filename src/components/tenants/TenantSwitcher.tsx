import { useTenant } from '../../tenants/useTenant'
import { AppSelect } from '../ui/AppSelect'

export function TenantSwitcher() {
  const { tenants, currentTenantId, setCurrentTenantId, canAccessTenant } = useTenant()

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
