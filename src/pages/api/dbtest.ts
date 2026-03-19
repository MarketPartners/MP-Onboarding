import type { NextApiRequest, NextApiResponse } from 'next'

// Visit /api/dbtest?key=YOUR_SETUP_KEY to diagnose database issues

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = req.query.key
  const expected = process.env.SETUP_KEY || 'marketpartners2024'
  if (key !== expected) {
    return res.status(403).json({ error: 'Add ?key=YOUR_SETUP_KEY to the URL' })
  }

  // Check which DB environment variables are present
  const diagnostics = {
    DATABASE_URL_set:          !!process.env.DATABASE_URL,
    POSTGRES_URL_set:          !!process.env.POSTGRES_URL,
    POSTGRES_PRISMA_URL_set:   !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING_set: !!process.env.POSTGRES_URL_NON_POOLING,
    DATABASE_URL_prefix:       process.env.DATABASE_URL       ? process.env.DATABASE_URL.substring(0, 20)       + '...' : 'NOT SET',
    POSTGRES_URL_prefix:       process.env.POSTGRES_URL       ? process.env.POSTGRES_URL.substring(0, 20)       + '...' : 'NOT SET',
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'No database URL found in environment variables',
      diagnostics,
      fix: 'Go to Vercel → Storage tab → click your Postgres database → click Connect Project → select your project. This adds DATABASE_URL automatically.'
    })
  }

  // Try a real connection
  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(url)
    const result = await sql`SELECT NOW() as time, current_database() as db`
    
    // Check if submissions table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'submissions'
      ) as exists
    `
    const tableExists = tableCheck[0]?.exists

    return res.json({
      success: true,
      message: 'Database connected successfully',
      database: result[0]?.db,
      serverTime: result[0]?.time,
      submissionsTableExists: tableExists,
      fix: tableExists ? null : 'Table does not exist yet. Visit /api/setup?key=YOUR_KEY to create it.',
      diagnostics,
    })
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || String(err),
      diagnostics,
      fix: 'Check that your Postgres database is connected to this Vercel project. Go to Vercel → Storage → Connect Project.'
    })
  }
}
