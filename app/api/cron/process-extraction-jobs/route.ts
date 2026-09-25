import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  compareExtractionOutputs,
  processOpenRouterExtractionSnapshot,
  type QueuedExtractionResult,
  type CategoryRow,
} from '@/lib/openai'

import { backoffMs, getRetryAfterMs, isRetryableExtractionError } from '@/lib/extractionRetry'

export const dynamic = 'force-dynamic'

export const maxDuration = 300

const DEFAULT_BATCH_LIMIT = 20
const DEFAULT_CONCURRENCY = 3
const MAX_BATCH_LIMIT = 100
const MAX_CONCURRENCY = 10

interface EmailExtractionJob {
  id: string
  source_email_audit_id: string | null
  email_id: string
  uid: number | null
  sender: string | null
  subject: string | null
  received_at: string | null
  cleaned_body: string | null
  image_urls: string[] | null
  prompt_version: string
  provider: string
  model: string
  status: string
  attempt_count: number
  production_output: QueuedExtractionResult | null
}

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

function boundedInt(value: string | null, fallback: number, max: number): number {
  const parsed = value ? Number(value) : NaN
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(1, Math.floor(parsed)))
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let index = 0
  const next = async (): Promise<void> => {
    while (true) {
      const current = index++
      if (current >= items.length) return
      results[current] = await worker(items[current])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next())
  )
  return results
}

async function getExtractionCategories(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('slug, label, is_editorial')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[extraction-jobs] category load error:', JSON.stringify(error))
    return []
  }

  return ((data ?? []) as Array<{ slug: string; label: string; is_editorial?: boolean }>)
    .filter((c) => !c.is_editorial)
    .map((c) => ({ slug: c.slug, label: c.label }))
}

async function recordAttempt(
  supabase: ReturnType<typeof createServiceClient>,
  values: {
    job: EmailExtractionJob
    status: 'completed' | 'retryable_error' | 'failed'
    startedAt: number
    retryAfterMs?: number | null
    error?: string | null
    normalizedOutput?: unknown
  },
): Promise<void> {
  const { error } = await supabase
    .from('email_extraction_attempts')
    .insert({
      job_id: values.job.id,
      attempt_number: values.job.attempt_count,
      provider: values.job.provider,
      model: values.job.model,
      status: values.status,
      started_at: new Date(values.startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - values.startedAt,
      retry_after_ms: values.retryAfterMs ?? null,
      error: values.error ?? null,
      normalized_output: values.normalizedOutput ?? null,
    })
  if (error) {
    console.error('[extraction-jobs] attempt insert error:', JSON.stringify(error))
  }
}

async function upsertComparison(
  supabase: ReturnType<typeof createServiceClient>,
  job: EmailExtractionJob,
  shadowOutput: QueuedExtractionResult | null,
  providerError: string | null = null,
): Promise<void> {
  const productionOutput = job.production_output
  if (!productionOutput) {
    console.warn(`[extraction-jobs] missing production output for job ${job.id}`)
    return
  }

  const comparison = compareExtractionOutputs(productionOutput, shadowOutput, providerError)
  const { error } = await supabase
    .from('email_extraction_comparisons')
    .upsert({
      job_id: job.id,
      source_email_audit_id: job.source_email_audit_id,
      email_id: job.email_id,
      prompt_version: productionOutput.prompt_version,
      production_provider: productionOutput.provider,
      production_model: productionOutput.model,
      shadow_provider: shadowOutput?.provider ?? job.provider,
      shadow_model: shadowOutput?.model ?? job.model,
      production_output: productionOutput,
      shadow_output: shadowOutput,
      status: comparison.status,
      production_schema_valid: comparison.production_schema_valid,
      shadow_schema_valid: comparison.shadow_schema_valid,
      deal_count_match: comparison.deal_count_match,
      retailer_agreement: comparison.retailer_agreement,
      deal_type_agreement: comparison.deal_type_agreement,
      percent_agreement: comparison.percent_agreement,
      promo_code_agreement: comparison.promo_code_agreement,
      category_agreement: comparison.category_agreement,
      description_differences: comparison.description_differences,
      details: comparison.details,
      error: providerError,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'job_id',
    })
  if (error) {
    console.error('[extraction-jobs] comparison upsert error:', JSON.stringify(error))
  }
}

async function processJob(
  supabase: ReturnType<typeof createServiceClient>,
  job: EmailExtractionJob,
  categories: CategoryRow[],
): Promise<{ id: string; status: string }> {
  const startedAt = Date.now()
  try {
    const normalizedOutput = await processOpenRouterExtractionSnapshot({
      from: job.sender ?? '',
      subject: job.subject ?? '',
      cleanedBody: job.cleaned_body ?? '',
      imageUrls: job.image_urls ?? [],
    }, categories)

    await recordAttempt(supabase, {
      job,
      status: 'completed',
      startedAt,
      normalizedOutput,
    })
    await upsertComparison(supabase, job, normalizedOutput)

    const { error } = await supabase
      .from('email_extraction_jobs')
      .update({
        status: 'completed',
        normalized_output: normalizedOutput,
        last_error: null,
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
    if (error) throw error

    return { id: job.id, status: 'completed' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const retryAfterMs = getRetryAfterMs(err)
    const retryable = isRetryableExtractionError(err)
    const nextAttemptAt = new Date(Date.now() + backoffMs(job.attempt_count, retryAfterMs)).toISOString()

    await recordAttempt(supabase, {
      job,
      status: retryable ? 'retryable_error' : 'failed',
      startedAt,
      retryAfterMs,
      error: message,
    })

    if (!retryable) {
      await upsertComparison(supabase, job, null, message)
    }

    const update = retryable
      ? {
          status: 'pending',
          next_attempt_at: nextAttemptAt,
          last_error: message,
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        }
      : {
          status: 'failed',
          last_error: message,
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        }

    const { error } = await supabase
      .from('email_extraction_jobs')
      .update(update)
      .eq('id', job.id)
    if (error) console.error('[extraction-jobs] job update error:', JSON.stringify(error))

    return { id: job.id, status: retryable ? 'pending' : 'failed' }
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const batchLimit = boundedInt(
    request.nextUrl.searchParams.get('limit') ?? process.env.EXTRACTION_JOBS_BATCH_LIMIT ?? null,
    DEFAULT_BATCH_LIMIT,
    MAX_BATCH_LIMIT,
  )
  const concurrency = boundedInt(
    request.nextUrl.searchParams.get('concurrency') ?? process.env.EXTRACTION_JOBS_CONCURRENCY ?? null,
    DEFAULT_CONCURRENCY,
    MAX_CONCURRENCY,
  )
  const workerId = `cron-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { data, error } = await supabase.rpc('claim_email_extraction_jobs', {
    p_limit: batchLimit,
    p_worker_id: workerId,
    p_provider: 'openrouter',
  })

  if (error) {
    console.error('[extraction-jobs] claim error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to claim jobs' }, { status: 500 })
  }

  const jobs = (data ?? []) as EmailExtractionJob[]
  if (jobs.length === 0) {
    return NextResponse.json({ claimed: 0, completed: 0, pending: 0, failed: 0 })
  }

  const categories = await getExtractionCategories(supabase)
  const results = await runWithConcurrency(
    jobs,
    concurrency,
    (job) => processJob(supabase, job, categories),
  )

  const counts = results.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return NextResponse.json({
    claimed: jobs.length,
    completed: counts.completed ?? 0,
    pending: counts.pending ?? 0,
    failed: counts.failed ?? 0,
    worker_id: workerId,
  })
}
