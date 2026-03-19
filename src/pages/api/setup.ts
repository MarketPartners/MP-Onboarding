import type { NextApiRequest, NextApiResponse } from 'next'
import { createTable } from '../../lib/db'

// Visit /api/setup once after deploying to create the database table.
// Protected by a simple setup key so only you can run it.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = req.query.key || req.body?.key
  const expected = process.env.SETUP_KEY || 'setup-mp-2024'

  if (key !== expected) {
    return res.status(403).json({ error: 'Invalid setup key. Add ?key=YOUR_SETUP_KEY to the URL.' })
  }

  try {
    await createTable()
    res.json({ ok: true, message: 'Database table created (or already exists). You are ready to go.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Database setup failed.', detail: err.message })
  }
}
