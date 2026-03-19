import { SignJWT, jwtVerify } from 'jose'
import { NextApiRequest, NextApiResponse } from 'next'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mp-intake-fallback-secret-change-in-production'
)
const COOKIE = 'mp_session'

// ── User store ────────────────────────────────────────────────────────────────
// Users are defined via env vars:
//   USERS=alice:pass1,bob:pass2,adviser:adviserpass
// The "role" field is set via ADVISER_USERS=adviser,bob
// Anyone not in ADVISER_USERS gets role "client"

export function getUsers(): Record<string, { password: string; role: 'client' | 'adviser' }> {
  const raw = process.env.USERS || ''
  const adviserSet = new Set((process.env.ADVISER_USERS || '').split(',').map(s => s.trim()).filter(Boolean))
  const users: Record<string, { password: string; role: 'client' | 'adviser' }> = {}

  raw.split(',').forEach(pair => {
    const [username, ...rest] = pair.trim().split(':')
    if (username && rest.length) {
      users[username.trim()] = {
        password: rest.join(':').trim(),
        role: adviserSet.has(username.trim()) ? 'adviser' : 'client',
      }
    }
  })
  return users
}

export function verifyLogin(username: string, password: string): { role: 'client' | 'adviser'; username: string } | null {
  const users = getUsers()
  const user = users[username]
  if (!user) return null
  if (user.password !== password) return null
  return { role: user.role, username }
}

// ── JWT helpers ───────────────────────────────────────────────────────────────
export async function createSessionToken(payload: { username: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(SECRET)
}

export async function verifySessionToken(token: string): Promise<{ username: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { username: string; role: string }
  } catch {
    return null
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
export function getTokenFromRequest(req: NextApiRequest): string | null {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(new RegExp(`${COOKIE}=([^;]+)`))
  return match ? match[1] : null
}

export function setSessionCookie(res: NextApiResponse, token: string) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`)
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`)
}

// ── Auth guard ────────────────────────────────────────────────────────────────
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredRole?: 'client' | 'adviser'
): Promise<{ username: string; role: string } | null> {
  const token = getTokenFromRequest(req)
  if (!token) { res.status(401).json({ error: 'Not authenticated' }); return null }
  const session = await verifySessionToken(token)
  if (!session) { res.status(401).json({ error: 'Session expired' }); return null }
  if (requiredRole && session.role !== requiredRole && session.role !== 'adviser') {
    res.status(403).json({ error: 'Insufficient permissions' }); return null
  }
  return session
}
