import { useEffect, useState } from 'react'
import { useTenant } from '../../tenants/useTenant'
import { AppSelect } from '../ui/AppSelect'
import { TopbarControl } from '../ui/TopbarControl'
import type { PlatformRole } from '../../auth/authTypes'
import {
  isLocalTestContextEnabled,
  loadLocalTestRole,
  saveLocalTestRole,
  saveLocalTestTenantId,
} from '../../auth/localTestContext'
import { loadCurrentTenantId, saveCurrentTenantId } from '../../tenants/tenantStorage'

const roleLabels: Record<PlatformRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Company Admin',
  COMPANY_USER: 'Company User',
}

export function LocalTestContextSwitcher() {
  const { tenants, currentTenantId, setCurrentTenantId } = useTenant()
  const [role, setRole] = useState<PlatformRole>(() => loadLocalTestRole())
  const [tenantId, setTenantId] = useState(() => loadCurrentTenantId() ?? currentTenantId ?? 'default-tenant')

  useEffect(() => {
    setTenantId(currentTenantId ?? loadCurrentTenantId() ?? 'default-tenant')
  }, [currentTenantId])

  if (!isLocalTestContextEnabled()) return null

  function handleRoleChange(nextRole: PlatformRole) {
    setRole(nextRole)
    saveLocalTestRole(nextRole)
  }

  function handleTenantChange(nextTenantId: string) {
    setTenantId(nextTenantId)
    saveCurrentTenantId(nextTenantId)
    saveLocalTestTenantId(nextTenantId)
    setCurrentTenantId(nextTenantId)
  }

  return (
    <TopbarControl className="local-test-switcher control-safe">
      <small>اختبار محلي</small>
      <div className="local-test-switcher-fields">
        <AppSelect
          value={role}
          onChange={(event) => handleRoleChange(event.target.value as PlatformRole)}
          aria-label="دور الاختبار المحلي"
        >
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </AppSelect>
        <AppSelect
          value={tenantId}
          onChange={(event) => handleTenantChange(event.target.value)}
          aria-label="مستأجر الاختبار المحلي"
        >
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </AppSelect>
      </div>
    </TopbarControl>
  )
}
