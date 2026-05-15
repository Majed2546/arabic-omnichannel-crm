import type { MockRequestOptions } from './types'

export class MockBackendError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MockBackendError'
  }
}

const DEFAULT_DELAY_MS = 420

function cloneResponse<T>(value: T): T {
  return structuredClone(value)
}

export async function mockRequest<T>(value: T, options: MockRequestOptions = {}): Promise<T> {
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS

  await new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })

  if (options.shouldFail) {
    throw new MockBackendError('تعذر تحميل البيانات التجريبية. حاول مرة أخرى.')
  }

  return cloneResponse(value)
}

export function findOrThrow<T>(items: T[], predicate: (item: T) => boolean, message: string): T {
  const item = items.find(predicate)
  if (!item) throw new MockBackendError(message)
  return item
}

