import { getCurrentTenantId } from '../tenants/tenantUtils'
import { getMockResponse } from '../lib/mockData'
import type { Company } from './types'

type CompanyEdge = {
  node?: unknown
}

type CompaniesConnection = {
  edges?: unknown
  nodes?: unknown
}

type CompaniesPayload = {
  companies?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeCompany(value: unknown): Company | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' ? value.id : null
  const name = typeof value.name === 'string' ? value.name : null

  if (!id || !name) return null

  const domainName = isRecord(value.domainName) ? value.domainName : null
  const domain = domainName && typeof domainName.primaryLinkUrl === 'string'
    ? domainName.primaryLinkUrl
    : typeof value.domain === 'string'
      ? value.domain
      : undefined

  return {
    id,
    name,
    domain,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    status: typeof value.status === 'string' ? value.status : undefined,
    industry: typeof value.industry === 'string' ? value.industry : undefined,
    employees: typeof value.employees === 'number' ? value.employees : undefined,
  }
}

function normalizeCompanyArray(values: unknown): Company[] {
  if (!Array.isArray(values)) return []
  return values.map(normalizeCompany).filter((company): company is Company => Boolean(company))
}

export function normalizeCompaniesPayload(payload: unknown): Company[] {
  const companies = isRecord(payload) && 'companies' in payload
    ? (payload as CompaniesPayload).companies
    : payload

  if (Array.isArray(companies)) {
    return normalizeCompanyArray(companies)
  }

  if (!isRecord(companies)) {
    return []
  }

  const connection = companies as CompaniesConnection

  if (Array.isArray(connection.nodes)) {
    return normalizeCompanyArray(connection.nodes)
  }

  if (Array.isArray(connection.edges)) {
    return connection.edges
      .map((edge: CompanyEdge) => normalizeCompany(isRecord(edge) ? edge.node : null))
      .filter((company): company is Company => Boolean(company))
  }

  return []
}

export function getMockCompaniesFallback(): Company[] {
  const response = getMockResponse('GetCompanies', getCurrentTenantId())
  return normalizeCompaniesPayload(response)
}
