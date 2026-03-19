import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  Shell, Card, SectionTitle, SubHeading,
  Field, Input, Select, Textarea,
} from '../components/ui'
import { ClientFormData, AdviserFormData, FullFormData, ADVISER_DEFAULTS, CLIENT_DEFAULTS } from '../lib/types'

const VEHICLES     = ['SMSF', 'Company', 'Trust', 'Joint personal account', 'Individual account']
const ALL_PRODUCTS = ['Australian Shares', 'International Shares', 'Listed Managed Funds',
                      'Listed Debt Securities', 'Listed Property Trust', 'IPOs',
                      'Hybrids', 'Bonds', 'Cash Management Account']

type Submission = {
  id: number; token: string; client_name: string
  entity_name: string; status: string; created_at: string
}

function AllocRow({ label, minKey, maxKey, data, update }: {
  label: string
  minKey: keyof AdviserFormData
  maxKey: keyof AdviserFormData
  data: AdviserFormData
  update: (k: keyof AdviserFormData, v: any) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 90px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 14, color: '#444' }}>{label}</span>
      {([minKey, maxKey] as (keyof AdviserFormData)[]).map(k => (
        <div key={k as string} style={{ position: 'relative' }}>
          <input
            type="number" value={data[k] as string}
            onChange={e => update(k, e.target.value)}
            style={{ width: '100%', padding: '8px 28px 8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}
            onFocus={e => e.target.style.borderColor = '#1FBCA1'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
          />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa', pointerEvents: 'none' }}>%</span>
        </div>
      ))}
    </div>
  )
}

function ClientDataReview({ d }: { d: ClientFormData }) {
  const c1 = [d.c1_first, d.c1_last].filter(Boolean).join(' ')
  const c2 = [d.c2_first, d.c2_last].filter(Boolean).join(' ')
  const totalAssets = (d.assets || []).reduce((s, a) => s + (parseFloat(a.val) || 0), 0)
  const totalLiabs  = (d.liabilities || []).reduce((s, l) => s + (parseFloat(l.val) || 0), 0)
  const fmt = (n: number) => '$' + n.toLocaleString('en-AU')

  return (
    <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13, lineHeight: 1.8 }}>
        <div><strong style={{ color: '#0D1F35' }}>Primary client:</strong> {c1} {d.c1_age ? `(age ${d.c1_age})` : ''}</div>
        {c2 && <div><strong style={{ color: '#0D1F35' }}>Secondary client:</strong> {c2} {d.c2_age ? `(age ${d.c2_age})` : ''}</div>}
        <div><strong style={{ color: '#0D1F35' }}>Entity:</strong> {d.entity_name || '–'}</div>
        <div><strong style={{ color: '#0D1F35' }}>Type:</strong> {d.entity_type || '–'}</div>
        <div><strong style={{ color: '#0D1F35' }}>Address:</strong> {d.entity_address || '–'}</div>
        <div><strong style={{ color: '#0D1F35' }}>Employment:</strong> {d.c1_employment || '–'}</div>
        <div><strong style={{ color: '#0D1F35' }}>Risk:</strong> {d.risk_tolerance}</div>
        <div><strong style={{ color: '#0D1F35' }}>Objective:</strong> {d.inv_objective}</div>
        <div><strong style={{ color: '#0D1F35' }}>Timeframe:</strong> {d.inv_timeframe}</div>
        <div><strong style={{ color: '#0D1F35' }}>Experience:</strong> {d.inv_experience}</div>
        <div><strong style={{ color: '#0D1F35' }}>Total assets:</strong> {fmt(totalAssets)}</div>
        <div><strong style={{ color: '#0D1F35' }}>Net position:</strong> {fmt(totalAssets - totalLiabs)}</div>
      </div>
      {d.goals_text && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee', fontSize: 13 }}>
          <strong style={{ color: '#0D1F35' }}>Goals & objectives:</strong>
          <p style={{ marginTop: 4, color: '#555', lineHeight: 1.6 }}>{d.goals_text}</p>
        </div>
      )}
      {d.limitations_text && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <strong style={{ color: '#0D1F35' }}>Limitations:</strong>
          <p style={{ marginTop: 4, color: '#555' }}>{d.limitations_text}</p>
        </div>
      )}
      {/* Assets table */}
      {d.assets && d.assets.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #eee' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1FBCA1', marginBottom: 8 }}>Assets</div>
          {d.assets.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ color: '#555' }}>{a.desc} <span style={{ color: '#aaa', fontSize: 11 }}>({a.own})</span></span>
              <span style={{ color: '#0D1F35', fontWeight: 500 }}>{a.val ? '$' + parseFloat(a.val).toLocaleString('en-AU') : '–'}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', fontWeight: 600 }}>
            <span style={{ color: '#0D1F35' }}>Total assets</span>
            <span style={{ color: '#1FBCA1' }}>{fmt(totalAssets)}</span>
          </div>
        </div>
      )}
      {/* Liabilities */}
      {d.liabilities && d.liabilities.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1FBCA1', marginBottom: 8 }}>Liabilities</div>
          {d.liabilities.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ color: '#555' }}>{l.desc} <span style={{ color: '#aaa', fontSize: 11 }}>({l.own})</span></span>
              <span style={{ color: '#0D1F35', fontWeight: 500 }}>{l.val ? '$' + parseFloat(l.val).toLocaleString('en-AU') : '–'}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', fontWeight: 600 }}>
            <span style={{ color: '#0D1F35' }}>Net financial position</span>
            <span style={{ color: '#1FBCA1' }}>{fmt(totalAssets - totalLiabs)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [loadError, setLoadError]     = useState('')

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    sessionStorage.removeItem('mp_pending_token')
    router.push('/')
  }

  const loadDashboard = useCallback(async () => {
    setView('dashboard')
    setLoadingList(true)
    setLoadError('')
    try {
      const res = await fetch('/api/submissions')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch {
      setLoadError('Could not load submissions. Please refresh.')
      setSubmissions([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadSubmission = useCallback(async (token: string) => {
    setLoadError('')
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', token }),
      })
      if (!res.ok) {
        setLoadError('Could not find this submission. It may have been deleted.')
        await loadDashboard()
        return
      }
      const data = await res.json()
      setClientData(data.submission.client_data)
      setActiveToken(token)
      setAdvData(ADVISER_DEFAULTS)
      setGenerated(false)
      setError('')
      setView('proposal')
      window.history.replaceState({}, '', '/adviser')
      sessionStorage.removeItem('mp_pending_token')
    } catch {
      setLoadError('Failed to load submission.')
      await loadDashboard()
    }
  }, [loadDashboard])

  // ── Auth + initial load ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/me').then(r => {
      if (!r.ok) { router.push('/'); return null }
      return r.json()
    }).then(d => {
      if (!d) return
      if (d.role !== 'adviser') { router.push('/client'); return }
      setUsername(d.username)
      setAuthChecked(true)

      // Check URL then sessionStorage for token
      const params = new URLSearchParams(window.location.search)
      const token  = params.get('token') || sessionStorage.getItem('mp_pending_token')
      if (token) {
        loadSubmission(token)
      } else {
        loadDashboard()
      }
    }).catch(() => router.push('/'))
  }, [])

  const upd = useCallback((k: keyof AdviserFormData, v: any) => {
    setAdvData(prev => ({ ...prev, [k]: v }))
  }, [])

  const toggleProduct = (p: string) => {
    setAdvData(prev => ({
      ...prev,
      products: prev.products.includes(p)
        ? prev.products.filter(x => x !== p)
        : [...prev.products, p],
    }))
  }

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
      a.href = url
      a.download = `${name}_Investment_Program.docx`
      a.click()
      URL.revokeObjectURL(url)
      setGenerated(true)
      // Mark as completed in DB
      if (activeToken) {
        await fetch('/api/submissions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: activeToken }),
        })
        // Refresh dashboard list silently
        const listRes = await fetch('/api/submissions')
        const listData = await listRes.json()
        setSubmissions(listData.submissions || [])
      }
    } catch {
      setError('Document generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
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

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  const c1Name      = [clientData.c1_first, clientData.c1_last].filter(Boolean).join(' ')
  const c2Name      = [clientData.c2_first, clientData.c2_last].filter(Boolean).join(' ')
  const clientNames = [c1Name, c2Name].filter(Boolean).join(' & ') || 'Client'

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <Shell username={username} onLogout={handleLogout}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 500, color: '#0D1F35' }}>Client Submissions</h1>
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Click any client to complete their proposal and generate the Investment Program document.</p>
          </div>
          <button onClick={loadDashboard} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, color: '#666', cursor: 'pointer', marginTop: 4 }}>
            ↻ Refresh
          </button>
        </div>

        {loadError && (
          <div style={{ background: '#fff5f5', border: '1px solid #fcc', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#c33', marginBottom: 16 }}>{loadError}</div>
        )}

        {loadingList ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✉</div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#0D1F35', marginBottom: 8, fontSize: 20 }}>No submissions yet</h3>
              <p style={{ color: '#888', fontSize: 14 }}>When clients submit their details, they will appear here.</p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {submissions.map(s => {
              const date = new Date(s.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              const isPending = s.status === 'pending'
              return (
                <div key={s.token} style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: isPending ? '#1FBCA1' : '#ccc', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 500, color: '#0D1F35', fontSize: 15 }}>{s.client_name}</div>
                    {s.entity_name && <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{s.entity_name}</div>}
                  </div>
                  <div style={{ color: '#aaa', fontSize: 12, whiteSpace: 'nowrap' }}>{date}</div>
                  <div style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    background: isPending ? 'rgba(31,188,161,0.1)' : '#f5f5f5',
                    color: isPending ? '#1FBCA1' : '#999',
                  }}>
                    {isPending ? '● Pending' : '✓ Completed'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => loadSubmission(s.token)}
                      style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: '#0D1F35', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    >
                      {isPending ? 'Complete proposal →' : 'Re-open →'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.token)}
                      style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: 8, background: '#fff', color: '#ccc', fontSize: 13, cursor: 'pointer' }}
                      title="Delete submission"
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

  // ── PROPOSAL VIEW ──────────────────────────────────────────────────────────
  return (
    <Shell username={username} onLogout={handleLogout}>
      {/* Back button */}
      <button
        onClick={loadDashboard}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}
      >
        ← Back to all submissions
      </button>

      {/* Client summary banner */}
      <div style={{ background: '#0D1F35', borderRadius: 12, padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Client submission</div>
          <div style={{ color: '#fff', fontSize: 22, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{clientNames}</div>
          {clientData.entity_name && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>{clientData.entity_name} · {clientData.entity_type}</div>}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Risk',      value: clientData.risk_tolerance },
            { label: 'Objective', value: clientData.inv_objective  },
            { label: 'Timeframe', value: clientData.inv_timeframe  },
          ].filter(x => x.value).map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#1FBCA1', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Client data review */}
      <Card>
        <SectionTitle n="1–3" title="Client data" subtitle="Submitted by the client — read only. Scroll down to complete the proposal." />
        <ClientDataReview d={clientData} />
      </Card>

      <div style={{ height: 24 }} />

      {/* Proposal scope */}
      <Card>
        <SectionTitle n="4" title="Proposal scope" subtitle="Complete the investment program details below, then generate the Word document." />

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
              fontFamily: 'DM Sans, sans-serif',
            }}>
              <span style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0, fontSize: 10, color: '#fff',
                border: advData.products.includes(p) ? '1.5px solid #1FBCA1' : '1px solid #ccc',
                background: advData.products.includes(p) ? '#1FBCA1' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {advData.products.includes(p) ? '✓' : ''}
              </span>
              {p}
            </button>
          ))}
        </div>

        <SubHeading>Allocation ranges</SubHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 90px', gap: 12, marginBottom: 12 }}>
          <div />
          {['Min %', 'Max %'].map(l => (
            <div key={l} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#999', textAlign: 'center' }}>{l}</div>
          ))}
        </div>
        <AllocRow label="Australian equities"            minKey="au_eq_min"  maxKey="au_eq_max"  data={advData} update={upd} />
        <AllocRow label="International equities"         minKey="int_eq_min" maxKey="int_eq_max" data={advData} update={upd} />
        <AllocRow label="Listed property"                minKey="prop_min"   maxKey="prop_max"   data={advData} update={upd} />
        <AllocRow label="Listed debt / hybrids / bonds"  minKey="debt_min"   maxKey="debt_max"   data={advData} update={upd} />
        <AllocRow label="Fixed income"                   minKey="fixed_min"  maxKey="fixed_max"  data={advData} update={upd} />
        <AllocRow label="Cash"                           minKey="cash_min"   maxKey="cash_max"   data={advData} update={upd} />

        <SubHeading>Additional notes for proposal</SubHeading>
        <Textarea
          value={advData.extra_notes}
          onChange={v => upd('extra_notes', v)}
          placeholder="Any additional context, rationale or special instructions to include in the proposal document..."
        />

        {/* Generate button */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid #fcc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c33', marginBottom: 16 }}>
              {error}
            </div>
          )}
          {generated && (
            <div style={{ background: '#f0faf7', border: '1px solid rgba(31,188,161,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1FBCA1', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✓ Investment Program downloaded — submission marked as completed. You can generate again if needed.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#888', maxWidth: 400 }}>
              This will generate a fully formatted Word document using all client data and the proposal details above.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '13px 36px', border: 'none', borderRadius: 8,
                background: generating ? '#ccc' : '#1FBCA1',
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: generating ? 'none' : '0 2px 8px rgba(31,188,161,0.3)',
              }}
            >
              {generating
                ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Generating document...</>
                : '⬇ Generate Investment Program'
              }
            </button>
          </div>
        </div>
      </Card>
    </Shell>
  )
}
