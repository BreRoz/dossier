import { ApiRateLimitError } from '@/lib/openai'

export function getProviderErrorStatus(err: unknown): number | null {
  if (err instanceof Error && 'status' in err) {
    const status = (err as { status?: number }).status
    return typeof status === 'number' ? status : null
  }
  return null
}

export function getRetryAfterMs(err: unknown): number | null {
  if (err instanceof ApiRateLimitError) return err.retryAfterMs
  if (!(err instanceof Error) || !('headers' in err)) return null
  const raw = (err as { headers?: { get?: (key: string) => string | null } })
    .headers
    ?.get?.('retry-after')
  if (!raw) return null
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  const retryAt = Date.parse(raw)
  if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now())
  return null
}

export function isLoadShedError(err: unknown): boolean {
  const status = getProviderErrorStatus(err)
  if (status === 529 || status === 503) return true
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return /overload|overloaded|load.?shed|capacity|temporarily unavailable|try again later/.test(message)
}

export function isRetryableExtractionError(err: unknown): boolean {
  if (err instanceof ApiRateLimitError) return true
  const status = getProviderErrorStatus(err)
  return status === 429 || (status !== null && status >= 500) || isLoadShedError(err)
}

export function backoffMs(attemptNumber: number, retryAfterMs: number | null): number {
  const exponential = Math.min(
    6 * 60 * 60 * 1000,
    60_000 * Math.pow(2, Math.max(0, attemptNumber - 1)),
  )
  const jitter = Math.floor(Math.random() * 10_000)
  return Math.max(exponential + jitter, retryAfterMs ?? 0)
}

