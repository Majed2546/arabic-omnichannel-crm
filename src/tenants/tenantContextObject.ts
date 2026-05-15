import { createContext } from 'react'
import type { TenantContextValue } from './tenantTypes'

export const TenantContext = createContext<TenantContextValue | undefined>(undefined)
