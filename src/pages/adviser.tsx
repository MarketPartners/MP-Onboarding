import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  Shell, Card, SectionTitle, SubHeading,
  Field, Input, Select, Textarea, NavRow,
} from '../components/ui'
import { ClientFormData, AdviserFormData, FullFormData, ADVISER_DEFAULTS, CLIENT_DEFAULTS } from '../lib/types'

const VEHICLES    = ['SMSF','Company','Trust','Joint personal account','Individual account']
const ALL_PRODUCTS = ['Australian Shares','International Shares','Listed Managed Funds','Listed Debt Securities','Listed Property Trust','IPOs','Hybrids','Bonds','Cash Management Account']

function AllocRow({ label, minKey, maxKey, data, update }: {
  label: string; minKey: keyof AdviserFormData; maxKey: keyof AdviserFormData
  data: AdviserFormData; update: (k: keyof AdviserFormData, v: any) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px', gap: 10, alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
      {([minKey, maxKey] as (keyof AdviserFormData)[]).map(k => (
        <div key={k as string} style={{ position: 'relative' }}>
          <input type="number" value={data[k] as string} onChange={e => update(k, e.target.value)}
            style={{ width: '100%', padding: '7px 24px 7px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }} />
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa' }}>%</span>
        </div>
      ))}
    </div>
  )
}

type Submission = { id: number; token: string; client_name: string; entity_name: string; status: string; created_at: string }

export default function AdviserPage() {
  const router = useRouter()
  const [username, setUsername]       = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [view, setView]               = useState<'dashboard' | 'proposal'>('dashboard')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [clientData, setClientData]   = useState<ClientFormData>(CLIENT_DEFAULTS)
  const [advData, setAdvData]         = useState<AdviserFormData>(ADVISER_DEFAULTS)
  const [activeToken, setActiveToken] = useState('')
  const [generating, setGenerating]   = useState(false)
  const [generated, setGenerated]     = useState(false)
  const [error, setError]             = useState('')

  const handleLogout = async () => { await fetch('/api/logout', { method: 'POST' }); router.push('/') }

  // ── Auth + initial load ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/me').then(r => {
      if (!r.ok) { router.push('/'); return null }
      return r.json()
    }).then(async d => {
      if (!d) return
      if (d.role !== 'adviser') { router.push('/client'); return }
      setUsername(d.username)
      setAuthChecked(true)

      // Check for ?token= in URL first, then sessionStorage fallback
      const params = new URLSearchParams(window.location.search)
      const token  = params.get('token') || sessionStorage.getItem('pending_token')
      if (token) {
        sessionStorage.removeItem('pending_token')
        window.history.replaceState({}, '', '/adviser')
        // Load submission directly here rather than calling loadSubmission
        // to avoid race condition with authChecked state
        try {
          const res = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get', token }),
          })
          if (!res.ok) {
            // Token not found — fall back to dashboard
            setLoadingList(true)
            const listRes = await fetch('/api/submissions')
            const listData = await listRes.json()
            setSubmissions(listData.submissions || [])
            setLoadingList(false)
            setView('dashboard')
            return
          }
          const data = await res.json()
          setClientData(data.submission.client_data)
          setActiveToken(token)
          setGenerated(false)
          setView('proposal')
        } catch {
          setView('dashboard')
          loadDashboard()
        }
      } else {
        loadDashboard()
      }
    }).catch(() => router.push('/'))
  }, [])

  // ── Load dashboard list ───────────────────────────────────────────────────
  const loadDashboard = async () => {
    setView('dashboard')
    setLoadingList(true)
    try {
      const res = await fetch('/api/submissions')
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch {
      setSubmissions([])
    } finally {
      setLoadingList(false)
    }
  }

  // ── Load a single submission by token ─────────────────────────────────────
  const loadSubmission = async (token: string) => {
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', token }),
      })
      if (!res.ok) { setError('Could not load submission.'); return }
      const data = await res.json()
      setClientData(data.submission.client_data)
      setActiveToken(token)
      setGenerated(false)
      setView('proposal')
      // Clean URL
      window.history.replaceState({}, '', '/adviser')
    } catch {
      setError('Failed to load submission.')
    }
  }

  const upd = useCallback((k: keyof AdviserFormData, v: any) => {
    setAdvData(prev => ({ ...prev, [k]: v }))
  }, [])

  const toggleProduct = (p: string) => {
    setAdvData(prev => ({
      ...prev,
      products: prev.products.includes(p) ? prev.products.filter(x => x !== p) : [...prev.products, p],
    }))
  }

  // ── Generate document ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true); setError('')
    try {
      const fullData: FullFormData = { ...clientData, ...advData }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData),
      })
      if (!res.ok) throw new Error('Generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const name = [clientData.c1_last, clientData.c2_last].filter(Boolean).join('_') || 'Client'
      a.href = url; a.download = `${name}_Investment_Program.docx`; a.click()
      URL.revokeObjectURL(url)
      setGenerated(true)
      // Mark as completed in DB
      if (activeToken) {
        await fetch('/api/submissions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: activeToken }),
        })
      }
    } catch { setError('Document generation failed. Please try again.') }
    finally { setGenerating(false) }
  }

  const handleDelete = async (token: string) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return
    await fetch('/api/submissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    loadDashboard()
  }

  if (!authChecked) return null

  const c1Name     = [clientData.c1_first, clientData.c1_last].filter(Boolean).join(' ')
  const c2Name     = [clientData.c2_first, clientData.c2_last].filter(Boolean).join(' ')
  const clientNames = [c1Name, c2Name].filter(Boolean).join(' & ') || 'Client'

  // ── DASHBOARD VIEW ────────────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <Shell username={username} onLogout={handleLogout}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 500, color: '#0D1F35' }}>Submissions</h1>
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Click any client to complete their proposal and generate the document.</p>
          </div>
          <button onClick={loadDashboard} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, color: '#666', cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>

        {loadingList ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✉</div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#0D1F35', marginBottom: 8 }}>No submissions yet</h3>
              <p style={{ color: '#888', fontSize: 14 }}>When clients submit their details, they will appear here.</p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {submissions.map(s => {
              const date = new Date(s.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
              const isPending   = s.status === 'pending'
              const isCompleted = s.status === 'completed'
              return (
                <div key={s.token} style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {/* Status dot */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: isPending ? '#1FBCA1' : '#ccc', flexShrink: 0 }} />
                  {/* Client info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 500, color: '#0D1F35', fontSize: 15 }}>{s.client_name}</div>
                    {s.entity_name && <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{s.entity_name}</div>}
                  </div>
                  {/* Date */}
                  <div style={{ color: '#aaa', fontSize: 13, whiteSpace: 'nowrap' }}>{date}</div>
                  {/* Status badge */}
                  <div style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    background: isPending ? 'rgba(31,188,161,0.1)' : '#f5f5f5',
                    color: isPending ? '#1FBCA1' : '#999',
                  }}>
                    {isPending ? 'Pending' : 'Completed'}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => loadSubmission(s.token)}
                      style={{ padding: '7px 16px', border: 'none', borderRadius: 8, background: '#0D1F35', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    >
                      {isPending ? 'Complete proposal →' : 'Re-open →'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.token)}
                      style={{ padding: '7px 12px', border: '1px solid #eee', borderRadius: 8, background: '#fff', color: '#ccc', fontSize: 13, cursor: 'pointer' }}
                      title="Delete"
                    >✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Shell>
    )
  }

  // ── PROPOSAL VIEW ─────────────────────────────────────────────────────────
  return (
    <Shell username={username} onLogout={handleLogout}>
      {/* Back to dashboard */}
      <button onClick={loadDashboard} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
        ← Back to all submissions
      </button>

      {/* Client summary banner */}
      <div style={{ background: '#0D1F35', borderRadius: 12, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Client submission</div>
          <div style={{ color: '#fff', fontSize: 20, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{clientNames}</div>
          {clientData.entity_name && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>{clientData.entity_name} · {clientData.entity_type}</div>}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Risk',      value: clientData.risk_tolerance },
            { label: 'Objective', value: clientData.inv_objective  },
            { label: 'Timeframe', value: clientData.inv_timeframe  },
          ].filter(x => x.value).map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#1FBCA1', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <SectionTitle n="4" title="Proposal scope" subtitle="Complete the investment program details then generate the Word document." />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Initial investment amount ($)">
            <Input type="number" value={advData.invest_amount} onChange={v => upd('invest_amount', v)} placeholder="e.g. 750000" />
          </Field>
          <Field label="Portfolio held within">
            <Select value={advData.portfolio_vehicle} onChange={v => upd('portfolio_vehicle', v)} options={VEHICLES} placeholder="Select..." />
          </Field>
          <Field label="Adviser name">
            <Input value={advData.adviser_name} onChange={v => upd('adviser_name', v)} placeholder="e.g. James Gerrish" />
          </Field>
          <Field label="Date of proposal">
            <Input value={advData.proposal_date} onChange={v => upd('proposal_date', v)}
              placeholder={new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} />
          </Field>
        </div>

        <SubHeading>Products in scope</SubHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {ALL_PRODUCTS.map(p => (
            <button key={p} type="button" onClick={() => toggleProduct(p)} style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', textAlign: 'left',
              border: advData.products.includes(p) ? '1.5px solid #1FBCA1' : '1px solid #ddd',
              background: advData.products.includes(p) ? 'rgba(31,188,161,0.07)' : '#fff',
              color: advData.products.includes(p) ? '#1FBCA1' : '#666',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, fontSize: 10, color: '#fff',
                border: advData.products.includes(p) ? '1.5px solid #1FBCA1' : '1px solid #ccc',
                background: advData.products.includes(p) ? '#1FBCA1' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {advData.products.includes(p) ? '✓' : ''}
              </span>
              {p}
            </button>
          ))}
        </div>

        <SubHeading>Allocation ranges</SubHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px', gap: 10, marginBottom: 10 }}>
          <div />
          {['Min', 'Max'].map(l => <div key={l} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#999', textAlign: 'center' }}>{l}</div>)}
        </div>
        <AllocRow label="Australian equities"           minKey="au_eq_min"  maxKey="au_eq_max"  data={advData} update={upd} />
        <AllocRow label="International equities"        minKey="int_eq_min" maxKey="int_eq_max" data={advData} update={upd} />
        <AllocRow label="Listed property"               minKey="prop_min"   maxKey="prop_max"   data={advData} update={upd} />
        <AllocRow label="Listed debt / hybrids / bonds" minKey="debt_min"   maxKey="debt_max"   data={advData} update={upd} />
        <AllocRow label="Fixed income"                  minKey="fixed_min"  maxKey="fixed_max"  data={advData} update={upd} />
        <AllocRow label="Cash"                          minKey="cash_min"   maxKey="cash_max"   data={advData} update={upd} />

        <SubHeading>Additional notes</SubHeading>
        <Textarea value={advData.extra_notes} onChange={v => upd('extra_notes', v)}
          placeholder="Any additional context or rationale to include in the proposal..." />

        {/* Client data review */}
        <SubHeading>Client data review</SubHeading>
        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 10, padding: '16px 20px', fontSize: 13, color: '#555', lineHeight: 1.8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
            <div><strong style={{ color: '#0D1F35' }}>Primary client:</strong> {c1Name} {clientData.c1_age ? `(age ${clientData.c1_age})` : ''}</div>
            {c2Name && <div><strong style={{ color: '#0D1F35' }}>Secondary client:</strong> {c2Name} {clientData.c2_age ? `(age ${clientData.c2_age})` : ''}</div>}
            <div><strong style={{ color: '#0D1F35' }}>Entity:</strong> {clientData.entity_name || '–'}</div>
            <div><strong style={{ color: '#0D1F35' }}>Type:</strong> {clientData.entity_type || '–'}</div>
            <div><strong style={{ color: '#0D1F35' }}>Risk:</strong> {clientData.risk_tolerance}</div>
            <div><strong style={{ color: '#0D1F35' }}>Objective:</strong> {clientData.inv_objective}</div>
            <div><strong style={{ color: '#0D1F35' }}>Timeframe:</strong> {clientData.inv_timeframe}</div>
            <div><strong style={{ color: '#0D1F35' }}>Experience:</strong> {clientData.inv_experience}</div>
          </div>
          {clientData.goals_text && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
              <strong style={{ color: '#0D1F35' }}>Goals:</strong> {clientData.goals_text}
            </div>
          )}
        </div>

        {/* Generate */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
          {error    && <div style={{ fontSize: 13, color: '#c33' }}>{error}</div>}
          {generated && <div style={{ fontSize: 13, color: '#1FBCA1' }}>✓ Document downloaded — submission marked as completed</div>}
          <button onClick={handleGenerate} disabled={generating} style={{
            padding: '12px 32px', border: 'none', borderRadius: 8,
            background: generating ? '#ccc' : '#1FBCA1', color: '#fff', fontSize: 15,
            fontWeight: 500, cursor: generating ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {generating
              ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Generating...</>
              : '⬇ Generate Investment Program'
            }
          </button>
        </div>
      </Card>
    </Shell>
  )
}
