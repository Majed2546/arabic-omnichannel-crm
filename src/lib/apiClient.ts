import { createTenantHeaders, withTenantScope } from '../tenants/tenantUtils'

type ApiFetchOptions = RequestInit & {
  tenantScopedBody?: Record<string, unknown>
}

export function createServiceHeaders(headers?: HeadersInit): Headers {
  const serviceHeaders = new Headers(headers)
  Object.entries(createTenantHeaders()).forEach(([key, value]) => {
    serviceHeaders.set(key, value)
  })
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
