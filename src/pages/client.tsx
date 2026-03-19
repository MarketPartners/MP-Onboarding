import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  Shell, ProgressBar, Card, SectionTitle, SubHeading,
  Field, Input, Select, Pills, Textarea, NavRow,
} from '../components/ui'
import { ClientFormData, AssetRow, CLIENT_DEFAULTS } from '../lib/types'

const STEPS = ['Client details', 'Financial position', 'Investment profile']
const EMPLOYMENTS = ['Self-Employed', 'Employed full-time', 'Employed part-time', 'Retired', 'Unemployed']
const HEALTHS = ['Excellent', 'Good', 'Fair', 'Poor']
const ENTITY_TYPES = ['SMSF', 'Company', 'Trust', 'Joint personal', 'Individual']
const OWN_OPTIONS = ['Joint', 'Primary client', 'Secondary client']
const TIMEFRAMES = ['0-2 years', '2-5 years', '5-7 years', '7-10 years', '10+ years']
const EXPERIENCES = ['Less than 1 year', '1-2 years', '2-5 years', '5+ years']
const RISKS = ['Conservative', 'Medium / Balanced', 'Growth', 'High Growth / Aggressive']
const OBJECTIVES = ['Capital preservation', 'Income only', 'Balance of income and growth', 'Growth focused', 'Aggressive growth']

function DynamicRows({ rows, setRows, valueLabel }: { rows: AssetRow[]; setRows: (r: AssetRow[]) => void; valueLabel: string }) {
  const update = (i: number, k: keyof AssetRow, v: string) => {
    const next = [...rows]; next[i] = { ...next[i], [k]: v }; setRows(next)
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 32px', gap: 8, marginBottom: 6 }}>
        {['Description', 'Ownership', valueLabel, ''].map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#999' }}>{h}</div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input value={row.desc} onChange={e => update(i, 'desc', e.target.value)} placeholder="e.g. Primary Residence"
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, width: '100%' }} />
          <select value={row.own} onChange={e => update(i, 'own', e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', width: '100%' }}>
            {OWN_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
          <input type="number" value={row.val} onChange={e => update(i, 'val', e.target.value)} placeholder="0"
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, width: '100%' }} />
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))}
            style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid #eee', background: 'transparent', cursor: 'pointer', color: '#bbb', fontSize: 18 }}>×</button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, { desc: '', own: 'Joint', val: '' }])}
        style={{ marginTop: 4, padding: '6px 14px', border: '1px dashed #ccc', borderRadius: 8, background: 'transparent', fontSize: 13, color: '#888', cursor: 'pointer' }}>
        + Add row
      </button>
    </div>
  )
}

export default function ClientPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
  const [data, setData] = useState<ClientFormData>(CLIENT_DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    fetch('/api/me').then(r => {
      if (!r.ok) { router.push('/'); return }
      return r.json()
    }).then(d => {
      if (d) {
        if (d.role === 'adviser') { router.push('/adviser'); return }
        setUsername(d.username)
        setAuthChecked(true)
      }
    }).catch(() => router.push('/'))
  }, [])

  const upd = useCallback((k: keyof ClientFormData, v: any) => {
    setData(prev => ({ ...prev, [k]: v }))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setSubmitted(true)
    } catch {
      alert('Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) return null

  if (submitted) {
    return (
      <Shell username={username} onLogout={handleLogout}>
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }} className="fade-in">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(31,188,161,0.12)', border: '2px solid #1FBCA1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>✓</div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500, color: '#0D1F35', marginBottom: 12 }}>
            Details submitted successfully
          </h2>
          <p style={{ color: '#666', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
            Thank you. Your information has been sent to your adviser at Market Partners. They will review your details and be in touch shortly.
          </p>
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 12, padding: '20px 24px' }}>
            <p style={{ color: '#888', fontSize: 13 }}>Questions? Contact us at</p>
            <a href="mailto:portfolio@marketpartners.com.au" style={{ color: '#1FBCA1', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>portfolio@marketpartners.com.au</a>
          </div>
        </div>
      </Shell>
    )
  }

  const step1 = (
    <>
      <SectionTitle n="1" title="Client details" subtitle="Please provide personal information for all account holders." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* Primary client */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1F35', paddingBottom: 8, borderBottom: '2px solid #1FBCA1' }}>Primary client</div>
          <Field label="First name"><Input value={data.c1_first} onChange={v => upd('c1_first', v)} placeholder="e.g. John" /></Field>
          <Field label="Last name"><Input value={data.c1_last} onChange={v => upd('c1_last', v)} placeholder="e.g. Smith" /></Field>
          <Field label="Age"><Input type="number" value={data.c1_age} onChange={v => upd('c1_age', v)} placeholder="e.g. 58" /></Field>
          <Field label="Employment status"><Select value={data.c1_employment} onChange={v => upd('c1_employment', v)} options={EMPLOYMENTS} placeholder="Select..." /></Field>
          <Field label="Annual income ($)"><Input type="number" value={data.c1_income} onChange={v => upd('c1_income', v)} placeholder="e.g. 80000" /></Field>
          <Field label="Current health"><Pills options={HEALTHS} value={data.c1_health} onChange={v => upd('c1_health', v)} /></Field>
        </div>
        {/* Secondary client */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1F35', paddingBottom: 8, borderBottom: '2px solid #eee' }}>
            Secondary client <span style={{ fontWeight: 400, color: '#aaa', fontSize: 12 }}>(if applicable)</span>
          </div>
          <Field label="First name"><Input value={data.c2_first} onChange={v => upd('c2_first', v)} placeholder="e.g. Jane" /></Field>
          <Field label="Last name"><Input value={data.c2_last} onChange={v => upd('c2_last', v)} placeholder="e.g. Smith" /></Field>
          <Field label="Age"><Input type="number" value={data.c2_age} onChange={v => upd('c2_age', v)} placeholder="e.g. 54" /></Field>
          <Field label="Employment status"><Select value={data.c2_employment} onChange={v => upd('c2_employment', v)} options={EMPLOYMENTS} placeholder="Select..." /></Field>
          <Field label="Annual income ($)"><Input type="number" value={data.c2_income} onChange={v => upd('c2_income', v)} placeholder="e.g. 75000" /></Field>
          <Field label="Current health"><Pills options={HEALTHS} value={data.c2_health} onChange={v => upd('c2_health', v)} /></Field>
        </div>
      </div>
      <SubHeading>Entity / account details</SubHeading>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Entity or fund name"><Input value={data.entity_name} onChange={v => upd('entity_name', v)} placeholder="e.g. Smith Family Superannuation Fund" /></Field>
        <Field label="Entity type"><Select value={data.entity_type} onChange={v => upd('entity_type', v)} options={ENTITY_TYPES} placeholder="Select..." /></Field>
        <Field label="Mailing address" span2><Input value={data.entity_address} onChange={v => upd('entity_address', v)} placeholder="e.g. 12 Example Street, Melbourne VIC 3000" /></Field>
      </div>
    </>
  )

  const step2 = (
    <>
      <SectionTitle n="2" title="Financial position" subtitle="Please provide your assets and liabilities as at today." />
      <SubHeading>Assets</SubHeading>
      <DynamicRows rows={data.assets} setRows={r => upd('assets', r)} valueLabel="Value ($)" />
      <SubHeading>Liabilities</SubHeading>
      <DynamicRows rows={data.liabilities} setRows={r => upd('liabilities', r)} valueLabel="Amount ($)" />
    </>
  )

  const step3 = (
    <>
      <SectionTitle n="3" title="Investment profile" subtitle="Help us understand your investment goals and risk appetite." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Field label="Investment timeframe"><Pills options={TIMEFRAMES} value={data.inv_timeframe} onChange={v => upd('inv_timeframe', v)} /></Field>
        <Field label="Investment experience"><Pills options={EXPERIENCES} value={data.inv_experience} onChange={v => upd('inv_experience', v)} /></Field>
        <Field label="Risk tolerance"><Pills options={RISKS} value={data.risk_tolerance} onChange={v => upd('risk_tolerance', v)} /></Field>
        <Field label="Primary investment objective"><Pills options={OBJECTIVES} value={data.inv_objective} onChange={v => upd('inv_objective', v)} /></Field>
        <Field label="Goals and objectives">
          <Textarea value={data.goals_text} onChange={v => upd('goals_text', v)}
            placeholder="Please describe your investment goals, income needs, capital preservation priorities, retirement plans or any other relevant information..." />
        </Field>
        <Field label="Any investment restrictions or preferences?">
          <Textarea value={data.limitations_text} onChange={v => upd('limitations_text', v)}
            placeholder="e.g. no tobacco stocks, ESG preferences, sector exclusions... or leave blank if none." />
        </Field>
      </div>

      {/* Submit notice */}
      <div style={{ marginTop: 24, background: '#f0faf7', border: '1px solid rgba(31,188,161,0.3)', borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ fontSize: 13, color: '#2a7a65', lineHeight: 1.6 }}>
          <strong>Almost done.</strong> Once you click "Submit details", your information will be securely sent to your adviser at Market Partners who will prepare your personalised Investment Program.
        </p>
      </div>
    </>
  )

  const steps = [step1, step2, step3]

  return (
    <Shell username={username} onLogout={handleLogout}>
      {/* Progress bar injected into header area */}
      <div style={{ marginTop: -32, marginLeft: -24, marginRight: -24, marginBottom: 32 }}>
        <ProgressBar steps={STEPS} current={step} onBack={i => setStep(i)} />
      </div>

      <Card>
        {steps[step]}
        <NavRow
          onBack={step > 0 ? () => setStep(s => s - 1) : undefined}
          onNext={step < 2 ? () => setStep(s => s + 1) : handleSubmit}
          nextLabel={step < 2 ? `${STEPS[step + 1]} →` : '✓ Submit details'}
          nextColor={step < 2 ? '#0D1F35' : '#1FBCA1'}
          loading={loading}
        />
      </Card>
    </Shell>
  )
}
