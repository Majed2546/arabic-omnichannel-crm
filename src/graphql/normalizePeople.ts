import { getMockResponse } from '../lib/mockData'
import { getCurrentTenantId } from '../tenants/tenantUtils'
import type { Person } from './types'

type PersonEdge = {
  node?: unknown
}

type PeopleConnection = {
  edges?: unknown
  nodes?: unknown
}

type PeoplePayload = {
  people?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getPersonName(value: Record<string, unknown>): string | null {
  if (typeof value.name === 'string' && value.name.trim()) return value.name

  if (isRecord(value.name)) {
    const firstName = typeof value.name.firstName === 'string' ? value.name.firstName : ''
    const lastName = typeof value.name.lastName === 'string' ? value.name.lastName : ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || null
  }

  return null
}

function getPersonEmail(value: Record<string, unknown>): string | undefined {
  if (typeof value.email === 'string') return value.email
  if (typeof value.workEmail === 'string') return value.workEmail

  if (isRecord(value.emails) && typeof value.emails.primaryEmail === 'string') {
    return value.emails.primaryEmail
  }

  return undefined
}

function normalizePerson(value: unknown): Person | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' ? value.id : null
  const name = getPersonName(value)

  if (!id || !name) return null

  return {
    id,
    name,
    email: getPersonEmail(value),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    role: typeof value.role === 'string' ? value.role : undefined,
    status: typeof value.status === 'string' ? value.status : undefined,
  }
}

function normalizePersonArray(values: unknown): Person[] {
  if (!Array.isArray(values)) return []
  return values.map(normalizePerson).filter((person): person is Person => Boolean(person))
}

export function normalizePeoplePayload(payload: unknown): Person[] {
  const people = isRecord(payload) && 'people' in payload
    ? (payload as PeoplePayload).people
    : payload

  if (Array.isArray(people)) {
    return normalizePersonArray(people)
  }

  if (!isRecord(people)) {
    return []
  }

  const connection = people as PeopleConnection

  if (Array.isArray(connection.nodes)) {
    return normalizePersonArray(connection.nodes)
  }

  if (Array.isArray(connection.edges)) {
    return connection.edges
      .map((edge: PersonEdge) => normalizePerson(isRecord(edge) ? edge.node : null))
      .filter((person): person is Person => Boolean(person))
  }

  return []
}

export function getMockPeopleFallback(): Person[] {
  const response = getMockResponse('GetPeople', getCurrentTenantId())
  return normalizePeoplePayload(response)
}
