import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiRateLimitError,
  createNormalizedExtractionOutput,
  type ExtractedDeal,
} from '@/lib/openai'
import {
  backoffMs,
  getRetryAfterMs,
  isRetryableExtractionError,
} from '@/lib/extractionRetry'

type QueryResult = { data?: unknown; error?: { message?: string } | null }

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function request(): never {
  return {
    headers: new Headers({ authorization: 'Bearer test-secret' }),
    nextUrl: new URL('http://localhost/api/cron/process-extraction-jobs'),
  } as never
}

function deal(overrides: Partial<ExtractedDeal> = {}): ExtractedDeal {
  return {
    retailer: 'Gap',
    description: '40% off jeans.',
    percent_off: 40,
    deal_type: 'percent-off',
    promo_code: 'SAVE40',
    expiration_date: null,
    link: null,
    categories: ['womens-clothes'],
    deal_subtype: null,
    keywords: ['jeans'],
    redemption_channel: 'online',
    ...overrides,
  }
}

function strictResponse(overrides: Partial<ExtractedDeal> = {}) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({ deals: [deal(overrides)] }),
        },
      },
    ],
  }
}

function job() {
  return {
    id: 'job_1',
    source_email_audit_id: 'audit_email_1',
    email_id: 'email_1',
    uid: 100,
    sender: 'Gap <sale@gap.com>',
    subject: 'Sale',
    received_at: new Date().toISOString(),
    cleaned_body: '40% off jeans with code SAVE40.',
    image_urls: [],
    prompt_version: 'deal-extraction-v2',
    provider: 'openrouter',
    model: 'google/gemini-2.5-flash-lite',
    status: 'processing',
    attempt_count: 1,
    production_output: createNormalizedExtractionOutput({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      method: 'text',
      deals: [deal()],
    }),
  }
}

function makeQuery(result: QueryResult = { data: null, error: null }) {
  const query: Record<string, unknown> = {}
  const chain = () => query
  for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert']) {
    query[method] = vi.fn(chain)
  }
  query.then = (resolve: (value: QueryResult) => unknown, reject: (reason?: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return query as Record<string, ReturnType<typeof vi.fn>> & { then: Promise<QueryResult>['then'] }
}

async function mockRoute(options: {
  openaiCreate: ReturnType<typeof vi.fn>
  claimedJobs?: unknown[]
}) {
  vi.stubEnv('CRON_SECRET', 'test-secret')
  vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key')
  const queries = {
    categories: [makeQuery({ data: [{ slug: 'womens-clothes', label: 'Womens Clothes', is_editorial: false }], error: null })],
    email_extraction_attempts: [makeQuery()],
    email_extraction_comparisons: [makeQuery()],
    email_extraction_jobs: [makeQuery()],
  }
  const cursors: Record<string, number> = {}
  const service = {
    rpc: vi.fn(async () => ({ data: options.claimedJobs ?? [job()], error: null })),
    from: vi.fn((table: keyof typeof queries) => {
      const index = cursors[table] ?? 0
      cursors[table] = index + 1
      const query = queries[table]?.[index]
      if (!query) throw new Error(`Unexpected Supabase table: ${String(table)}`)
      return query
    }),
    queries,
  }

  vi.doMock('@/lib/supabase/server', () => ({
    createServiceClient: vi.fn(() => service),
  }))
  vi.doMock('openai', () => ({
    default: vi.fn(function OpenAI() {
      return { chat: { completions: { create: options.openaiCreate } } }
    }),
  }))
  vi.resetModules()
  const route = await import('@/app/api/cron/process-extraction-jobs/route')
  return { route, service }
}

describe('retry classification and backoff scheduling', () => {
  it('classifies 429, 5xx, and load-shed errors as retryable', () => {
    expect(isRetryableExtractionError(new ApiRateLimitError('rate limited', 1234))).toBe(true)
    expect(isRetryableExtractionError(Object.assign(new Error('server'), { status: 500 }))).toBe(true)
    expect(isRetryableExtractionError(Object.assign(new Error('overloaded'), { status: 529 }))).toBe(true)
    expect(isRetryableExtractionError(Object.assign(new Error('bad request'), { status: 400 }))).toBe(false)
  })

  it('honors Retry-After while scheduling exponential backoff', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(getRetryAfterMs(new ApiRateLimitError('rate limited', 90_000))).toBe(90_000)
    expect(backoffMs(1, null)).toBe(60_000)
    expect(backoffMs(2, null)).toBe(120_000)
    expect(backoffMs(1, 180_000)).toBe(180_000)
  })
})

describe('GET /api/cron/process-extraction-jobs', () => {
  it('completes successful jobs and writes attempts plus comparisons', async () => {
    const openaiCreate = vi.fn(async () => strictResponse())
    const { route, service } = await mockRoute({ openaiCreate })

    const res = await route.GET(request())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ claimed: 1, completed: 1, pending: 0, failed: 0 })
    expect(service.queries.email_extraction_attempts[0].insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
    }))
    expect(service.queries.email_extraction_comparisons[0].upsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'match',
    }), expect.any(Object))
    expect(service.queries.email_extraction_jobs[0].update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
    }))
  })

  it('leaves jobs pending after a 429 with retry scheduling', async () => {
    const openaiCreate = vi.fn(async () => {
      throw Object.assign(new Error('rate limited'), {
        status: 429,
        headers: { get: (key: string) => key === 'retry-after' ? '75' : null },
      })
    })
    const { route, service } = await mockRoute({ openaiCreate })

    const res = await route.GET(request())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ claimed: 1, completed: 0, pending: 1, failed: 0 })
    expect(service.queries.email_extraction_attempts[0].insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'retryable_error',
      retry_after_ms: 75_000,
    }))
    expect(service.queries.email_extraction_jobs[0].update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      next_attempt_at: expect.any(String),
    }))
  })

  it('leaves jobs pending after a 5xx provider response', async () => {
    const openaiCreate = vi.fn(async () => {
      throw Object.assign(new Error('provider unavailable'), { status: 503 })
    })
    const { route, service } = await mockRoute({ openaiCreate })

    const res = await route.GET(request())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ pending: 1 })
    expect(service.queries.email_extraction_attempts[0].insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'retryable_error',
    }))
    expect(service.queries.email_extraction_jobs[0].update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
    }))
  })

  it('records schema_failed comparisons for invalid provider JSON', async () => {
    const openaiCreate = vi.fn(async () => ({
      choices: [{ message: { content: JSON.stringify({ deals: [{ retailer: 'Gap' }] }) } }],
    }))
    const { route, service } = await mockRoute({ openaiCreate })

    const res = await route.GET(request())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ completed: 1 })
    expect(service.queries.email_extraction_comparisons[0].upsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'schema_failed',
      shadow_schema_valid: false,
    }), expect.any(Object))
  })

  it('fails permanently and records provider_failed for non-retryable provider errors', async () => {
    const openaiCreate = vi.fn(async () => {
      throw Object.assign(new Error('bad schema request'), { status: 400 })
    })
    const { route, service } = await mockRoute({ openaiCreate })

    const res = await route.GET(request())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ failed: 1 })
    expect(service.queries.email_extraction_attempts[0].insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
    }))
    expect(service.queries.email_extraction_comparisons[0].upsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'provider_failed',
      error: 'bad schema request',
    }), expect.any(Object))
    expect(service.queries.email_extraction_jobs[0].update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
    }))
  })
})
