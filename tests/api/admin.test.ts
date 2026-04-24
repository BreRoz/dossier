import { describe, it, expect } from 'vitest'

// These tests verify the admin gate and admin API endpoints.
// The admin gate should fail closed: if ADMIN_EMAIL is not set, nobody gets in.

describe('Admin gate', () => {
  it.todo('redirects unauthenticated users to /')
  it.todo('redirects authenticated non-admin users to /')
  it.todo('blocks access when ADMIN_EMAIL env var is not set')
  it.todo('allows access when user email matches ADMIN_EMAIL')
})

describe('POST /api/admin/respond-suggestion', () => {
  it.todo('returns 401 when not authenticated')
  it.todo('returns 403 when authenticated as non-admin')
  it.todo('sends response email and updates suggestion for admin')
  it.todo('returns 400 when suggestion_id is missing')
})
