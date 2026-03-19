import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../lib/auth'
import { listSubmissions, getSubmission, markComplete, deleteSubmission } from '../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAuth(req, res, 'adviser')
  if (!session) return

  // GET — list all submissions
  if (req.method === 'GET') {
    const rows = await listSubmissions()
    return res.json({ submissions: rows })
  }

  // GET with token — get single submission
  if (req.method === 'POST' && req.body?.action === 'get') {
    const row = await getSubmission(req.body.token)
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ submission: row })
  }

  // PATCH — mark complete
  if (req.method === 'PATCH') {
    await markComplete(req.body.token)
    return res.json({ ok: true })
  }

  // DELETE
  if (req.method === 'DELETE') {
    await deleteSubmission(req.body.token)
    return res.json({ ok: true })
  }

  res.status(405).end()
}
