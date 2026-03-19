import { neon } from '@neondatabase/serverless'
import { ClientFormData } from './types'

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('No DATABASE_URL or POSTGRES_URL environment variable set.')
  return neon(url)
}

// ── Schema ────────────────────────────────────────────────────────────────────
export async function createTable() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id          SERIAL PRIMARY KEY,
      token       VARCHAR(32) UNIQUE NOT NULL,
      client_name VARCHAR(255),
      entity_name VARCHAR(255),
      status      VARCHAR(20) DEFAULT 'pending',
      client_data JSONB NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

// ── Generate a short random token ─────────────────────────────────────────────
export function generateToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 24; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

// ── Save a new client submission ──────────────────────────────────────────────
export async function saveSubmission(clientData: ClientFormData): Promise<string> {
  const sql = getDb()
  const token = generateToken()
  const c1Name = [clientData.c1_first, clientData.c1_last].filter(Boolean).join(' ') || 'Unknown'
  const c2Name = [clientData.c2_first, clientData.c2_last].filter(Boolean).join(' ')
  const clientName = [c1Name, c2Name].filter(Boolean).join(' & ')

  await sql`
    INSERT INTO submissions (token, client_name, entity_name, client_data)
    VALUES (
      ${token},
      ${clientName},
      ${clientData.entity_name || ''},
      ${JSON.stringify(clientData)}
    )
  `
  return token
}

// ── Get a submission by token ─────────────────────────────────────────────────
export async function getSubmission(token: string) {
  const sql = getDb()
  const result = await sql`
    SELECT * FROM submissions WHERE token = ${token}
  `
  return result[0] || null
}

// ── List all submissions ──────────────────────────────────────────────────────
export async function listSubmissions() {
  const sql = getDb()
  const result = await sql`
    SELECT id, token, client_name, entity_name, status, created_at
    FROM submissions
    ORDER BY created_at DESC
    LIMIT 50
  `
  return result
}

// ── Mark a submission as completed ───────────────────────────────────────────
export async function markComplete(token: string) {
  const sql = getDb()
  await sql`
    UPDATE submissions
    SET status = 'completed', updated_at = NOW()
    WHERE token = ${token}
  `
}

// ── Delete a submission ───────────────────────────────────────────────────────
export async function deleteSubmission(token: string) {
  const sql = getDb()
  await sql`DELETE FROM submissions WHERE token = ${token}`
}
