import { createTenantHeaders, getCurrentTenantId, withTenantScope } from '../tenants/tenantUtils'
import { getAuthToken, REST_API_BASE_URL } from './apiConfig'
import { loadLocalTestRole, loadLocalTestTenantId, shouldSendLocalTestHeaders } from '../auth/localTestContext'

type ApiFetchOptions = RequestInit & {
  tenantScopedBody?: Record<string, unknown>
}

export function createServiceHeaders(headers?: HeadersInit): Headers {
  const serviceHeaders = new Headers(headers)
  const authToken = getAuthToken()

  if (authToken && !serviceHeaders.has('Authorization')) {
    serviceHeaders.set('Authorization', `Bearer ${authToken}`)
  }

  Object.entries(createTenantHeaders()).forEach(([key, value]) => {
    serviceHeaders.set(key, value)
  })

  if (shouldSendLocalTestHeaders()) {
    serviceHeaders.set('x-local-platform-role', loadLocalTestRole())
    serviceHeaders.set('x-local-tenant-id', getCurrentTenantId() ?? loadLocalTestTenantId() ?? 'default-tenant')
  }

  return serviceHeaders
}

export function createTenantScopedBody(body: Record<string, unknown>) {
  return withTenantScope(body)
}

export function apiFetch(input: RequestInfo | URL, options: ApiFetchOptions = {}) {
  const { tenantScopedBody, headers, body, ...requestOptions } = options
  const scopedBody = tenantScopedBody ? JSON.stringify(createTenantScopedBody(tenantScopedBody)) : body

  return fetch(input, {
    ...requestOptions,
    body: scopedBody,
    headers: createServiceHeaders(headers),
  })
}

export function apiUrl(path: string) {
  const base = REST_API_BASE_URL.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}
