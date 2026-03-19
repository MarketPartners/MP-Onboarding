import React from 'react'
import { LOGO_WEB_B64 } from '../lib/logo'

// ── Logo ──────────────────────────────────────────────────────────────────────
export function Logo({ height = 44 }: { height?: number }) {
  return (
    <img
      src={`data:image/png;base64,${LOGO_WEB_B64}`}
      alt="Market Partners"
      style={{ height, width: 'auto', display: 'block' }}
    />
  )
}

// ── Page shell with nav ───────────────────────────────────────────────────────
export function Shell({ children, username, onLogout }: {
  children: React.ReactNode
  username?: string
  onLogout?: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f3ef' }}>
      <header style={{ background: '#0D1F35', padding: '0 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo height={40} />
          {username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{username}</span>
              <button onClick={onLogout} style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px' }}>
        {children}
      </main>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ steps, current, onBack }: { steps: string[]; current: number; onBack?: (i: number) => void }) {
  return (
    <div style={{ background: '#0D1F35', padding: '0 32px 20px', marginTop: -1 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div
              onClick={() => i < current && onBack?.(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: i < current ? 'pointer' : 'default' }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%', fontSize: 11, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: i < current ? 'rgba(31,188,161,0.2)' : i === current ? '#1FBCA1' : 'rgba(255,255,255,0.1)',
                border: i < current ? '1px solid rgba(31,188,161,0.5)' : i === current ? 'none' : '1px solid rgba(255,255,255,0.15)',
                color: i < current ? '#1FBCA1' : i === current ? '#fff' : 'rgba(255,255,255,0.35)',
              }}>
                {i < current ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: i < current ? 'rgba(31,188,161,0.8)' : i === current ? '#1FBCA1' : 'rgba(255,255,255,0.35)', fontWeight: i === current ? 500 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ── Form primitives ───────────────────────────────────────────────────────────
export function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }} className="fade-in">{children}</div>
}

export function SectionTitle({ n, title, subtitle }: { n: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#1FBCA1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Section {n}</div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500, color: '#0D1F35', lineHeight: 1.2, marginBottom: subtitle ? 6 : 0 }}>{title}</h2>
      {subtitle && <p style={{ color: '#888', fontSize: 14 }}>{subtitle}</p>}
    </div>
  )
}

export function SubHeading({ children }: { children: string }) {
  return <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#1FBCA1', marginTop: 28, marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid #eee' }}>{children}</div>
}

export function Field({ label, children, span2 = false }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span2 ? 'span 2' : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666' }}>{label}</label>
      {children}
    </div>
  )
}

export function Input({ value, onChange, placeholder, type = 'text', disabled = false }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, color: '#222', background: disabled ? '#f9f9f9' : '#fff', width: '100%' }}
    />
  )
}

export function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, color: value ? '#222' : '#999', background: '#fff', width: '100%', cursor: 'pointer' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)} style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: value === o ? '1.5px solid #1FBCA1' : '1px solid #ddd',
          background: value === o ? 'rgba(31,188,161,0.08)' : '#fff', color: value === o ? '#1FBCA1' : '#666', transition: 'all 0.15s',
        }}>{o}</button>
      ))}
    </div>
  )
}

export function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, color: '#222', background: '#fff', resize: 'vertical', lineHeight: 1.6, width: '100%' }}
    />
  )
}

export function NavRow({ onBack, onNext, nextLabel = 'Continue', loading = false, nextColor = '#0D1F35' }: {
  onBack?: () => void; onNext?: () => void; nextLabel?: string; loading?: boolean; nextColor?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
      {onBack ? (
        <button onClick={onBack} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: 'transparent', fontSize: 14, color: '#666', cursor: 'pointer' }}>← Back</button>
      ) : <div />}
      {onNext && (
        <button onClick={onNext} disabled={loading} style={{ padding: '10px 28px', border: 'none', borderRadius: 8, background: loading ? '#ccc' : nextColor, color: '#fff', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading ? <><span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Processing...</> : nextLabel}
        </button>
      )}
    </div>
  )
}
