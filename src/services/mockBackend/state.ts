import type { AsyncResource } from './types'

export function createIdleState<T>(): AsyncResource<T> {
  return { status: 'idle', data: null, error: null }
}

export function createLoadingState<T>(data: T | null = null): AsyncResource<T> {
  return { status: 'loading', data, error: null }
}

export function createSuccessState<T>(data: T): AsyncResource<T> {
  return { status: 'success', data, error: null }
}

export function createErrorState<T>(error: string, data: T | null = null): AsyncResource<T> {
  return { status: 'error', data, error }
}

