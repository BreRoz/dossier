import { describe, it, expect } from 'vitest'

// These tests verify auth guards on protected API routes.
// They require a Supabase test environment or mocked Supabase client.
// Fill in with your preferred mocking approach (e.g. msw, vi.mock).

describe('GET /api/preferences', () => {
  it.todo('returns 401 when not authenticated')
  it.todo('returns preferences for authenticated user')
  it.todo('returns 200 with default structure for new user')
})

describe('PUT /api/preferences', () => {
  it.todo('returns 401 when not authenticated')
  it.todo('updates preferences and returns 200 for authenticated user')
  it.todo('rejects invalid category names with 400')
})

describe('GET /api/stores', () => {
  it.todo('returns store list for authenticated user')
  it.todo('returns 401 when not authenticated')
})

describe('POST /api/stores/toggle', () => {
  it.todo('returns 401 when not authenticated')
  it.todo('returns 403 for free-tier user')
  it.todo('toggles store and returns 200 for paid user')
})

describe('POST /api/stores/suggest', () => {
  it.todo('returns 401 when not authenticated')
  it.todo('returns 403 for free-tier user')
  it.todo('creates suggestion and returns 200 for paid user')
})
