import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifySessionToken } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getTokenFromRequest(req)
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  const session = await verifySessionToken(token)
  if (!session) return res.status(401).json({ error: 'Session expired' })
  res.json({ username: session.username, role: session.role })
}
