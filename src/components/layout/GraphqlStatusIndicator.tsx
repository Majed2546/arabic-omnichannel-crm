import { useQuery } from '@apollo/client/react'
import { COMPANIES_QUERY } from '../../graphql/queries/companies'
import { GRAPHQL_API_URL, TWENTY_API_KEY } from '../../lib/apiConfig'
import { useTenantQueryOptions } from '../../tenants/useTenantQueryOptions'
import { normalizeCompaniesPayload } from '../../graphql/normalizeCompanies'

type CompaniesStatusData = {
  companies: unknown
}

export function GraphqlStatusIndicator() {
  const tenantQueryOptions = useTenantQueryOptions()
  const { data, loading, error } = useQuery<CompaniesStatusData>(COMPANIES_QUERY, {
    ...tenantQueryOptions,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  })

  const companies = normalizeCompaniesPayload(data)
  const isConnected = Array.isArray(companies) && companies.length > 0
  const label = loading
    ? 'جاري فحص GraphQL'
    : isConnected
      ? `GraphQL متصل (${companies.length})`
      : 'GraphQL غير متصل'

  const title = error
    ? `${GRAPHQL_API_URL} - ${error.message}${TWENTY_API_KEY ? '' : ' - أضف VITE_TWENTY_API_KEY للاتصال ببيانات Twenty.'}`
    : GRAPHQL_API_URL

  return (
    <span
      className={`topbar-control graphql-status control-safe ${isConnected ? 'success' : error ? 'error' : 'pending'}`}
      title={title}
      aria-live="polite"
    >
      <span aria-hidden="true" />
      {label}
    </span>
  )
}
