import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Logo } from '../components/ui'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Save ?token= from email link immediately
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      sessionStorage.setItem('mp_pending_token', token)
    }

    // Check if already logged in
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.role === 'adviser') {
        router.push('/adviser')
      } else if (d?.role === 'client') {
        // If there's a pending token, log out so adviser can log in
        const pending = sessionStorage.getItem('mp_pending_token')
        if (pending) {
          fetch('/api/logout', { method: 'POST' }).then(() => setChecking(false))
        } else {
          router.push('/client')
        }
      } else {
        setChecking(false)
      }
    }).catch(() => setChecking(false))
  }, [])

  const handleLogin = async () => {
    if (!username || !password) { setError('Please enter your username and password.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid credentials'); setLoading(false); return }

      if (data.role === 'adviser') {
        const pending = sessionStorage.getItem('mp_pending_token')
        if (pending) {
          router.push(`/adviser?token=${pending}`)
        } else {
          router.push('/adviser')
        }
      } else {
        // Client logged in — clear any pending token
        sessionStorage.removeItem('mp_pending_token')
        router.push('/client')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleLogin() }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f4f3ef', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0D1F35', padding: '20px 32px' }}>
        <Logo height={40} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
          <div style={{ background: '#fff', borderRadius: 16, padding: '40px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 500, color: '#0D1F35', marginBottom: 6 }}>
                Secure access
              </h1>
              <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6 }}>
                Please enter your credentials to access the client intake portal.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666' }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Enter your username"
                  autoComplete="username"
                  style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, color: '#222', background: '#fff', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = '#1FBCA1'}
                  onBlur={e => e.target.style.borderColor = '#ddd'}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, color: '#222', background: '#fff', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = '#1FBCA1'}
                  onBlur={e => e.target.style.borderColor = '#ddd'}
                />
              </div>
              {error && (
                <div style={{ background: '#fff5f5', border: '1px solid #fcc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c33' }}>
                  {error}
                </div>
              )}
              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  marginTop: 4, padding: '11px', border: 'none', borderRadius: 8,
                  background: loading ? '#ccc' : '#0D1F35', color: '#fff', fontSize: 15,
                  fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                {loading
                  ? <><span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Signing in...</>
                  : 'Sign in →'
                }
              </button>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 20 }}>
            Market Partners Financial Services Pty Limited · AFSL 488 798
          </p>
        </div>
      </div>
    </div>
  )
}
