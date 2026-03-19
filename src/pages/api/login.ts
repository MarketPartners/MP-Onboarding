import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyLogin, createSessionToken, setSessionCookie } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })

  const user = verifyLogin(username, password)
  if (!user) return res.status(401).json({ error: 'Invalid username or password' })

  const token = await createSessionToken({ username: user.username, role: user.role })
  setSessionCookie(res, token)
  res.json({ role: user.role, username: user.username })
}
