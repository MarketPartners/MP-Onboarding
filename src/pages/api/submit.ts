import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../lib/auth'
import { saveSubmission } from '../../lib/db'
import { Resend } from 'resend'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await requireAuth(req, res)
  if (!session) return

  const clientData = req.body

  let token: string
  try {
    token = await saveSubmission(clientData)
  } catch (err) {
    console.error('DB save failed:', err)
    return res.status(500).json({ error: 'Failed to save submission. Visit /api/setup to initialise the database first.' })
  }

  const c1Name = [clientData.c1_first, clientData.c1_last].filter(Boolean).join(' ') || 'Client'
  const c2Name = [clientData.c2_first, clientData.c2_last].filter(Boolean).join(' ')
  const clientNames = c2Name ? `${c1Name} & ${c2Name}` : c1Name
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mp-onboarding.vercel.app'
  const adviserLink = `${baseUrl}/adviser?token=${token}`

  const totalAssets = (clientData.assets || []).reduce((s: number, a: any) => s + (parseFloat(a.val) || 0), 0)
  const totalLiabs  = (clientData.liabilities || []).reduce((s: number, l: any) => s + (parseFloat(l.val) || 0), 0)
  const fmt = (n: number) => '$' + n.toLocaleString('en-AU')

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#333;">
      <div style="background:#0D1F35;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:500;">New Client Submission</h1>
        <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:14px;">Market Partners — Investment Program Intake</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#0D1F35;font-size:18px;margin:0 0 16px;">${clientNames}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr style="background:#f5f5f5;"><td style="padding:8px 12px;font-weight:600;color:#0D1F35;width:40%;">Entity</td><td style="padding:8px 12px;">${clientData.entity_name || '-'} (${clientData.entity_type || '-'})</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#0D1F35;background:#fafafa;">Address</td><td style="padding:8px 12px;background:#fafafa;">${clientData.entity_address || '-'}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:8px 12px;font-weight:600;color:#0D1F35;">Risk Profile</td><td style="padding:8px 12px;">${clientData.risk_tolerance}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#0D1F35;background:#fafafa;">Objective</td><td style="padding:8px 12px;background:#fafafa;">${clientData.inv_objective}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:8px 12px;font-weight:600;color:#0D1F35;">Timeframe</td><td style="padding:8px 12px;">${clientData.inv_timeframe}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#0D1F35;background:#fafafa;">Experience</td><td style="padding:8px 12px;background:#fafafa;">${clientData.inv_experience}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:8px 12px;font-weight:600;color:#0D1F35;">Total Assets</td><td style="padding:8px 12px;">${fmt(totalAssets)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#0D1F35;background:#fafafa;">Total Liabilities</td><td style="padding:8px 12px;background:#fafafa;">${fmt(totalLiabs)}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:8px 12px;font-weight:600;color:#0D1F35;">Net Position</td><td style="padding:8px 12px;">${fmt(totalAssets - totalLiabs)}</td></tr>
        </table>
        ${clientData.goals_text ? `<div style="background:#f0faf7;border-left:3px solid #1FBCA1;padding:12px 16px;margin-bottom:24px;"><strong style="color:#0D1F35;">Goals and Objectives</strong><p style="margin:6px 0 0;font-size:14px;">${clientData.goals_text}</p></div>` : ''}
        <div style="background:#0D1F35;border-radius:8px;padding:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);margin:0 0 16px;font-size:14px;">Click below to complete the Proposal Scope and generate the Investment Program document.</p>
          <a href="${adviserLink}" style="display:inline-block;background:#1FBCA1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">Complete Proposal</a>
        </div>
        <p style="color:#999;font-size:12px;margin:20px 0 0;text-align:center;">Reference: ${token}</p>
      </div>
    </div>
  `

  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && resendKey !== 'skip') {
      const resend = new Resend(resendKey)
      const toEmail = process.env.RESEND_TO_EMAIL || 'portfolio@marketpartners.com.au'

      const result = await resend.emails.send({
        from: 'Market Partners Intake <onboarding@resend.dev>',
        to: [toEmail],
        subject: `New client submission - ${clientNames}`,
        html: emailHtml,
      })

      if (result.error) {
        console.error('Resend error:', JSON.stringify(result.error))
        return res.json({ ok: true, warning: result.error.message })
      }

      console.log('Email sent, id:', result.data?.id)
    } else {
      console.log('[DEV] Email skipped. Adviser link:', adviserLink)
    }
    res.json({ ok: true })
  } catch (err: any) {
    console.error('Email exception:', err?.message || err)
    res.json({ ok: true, warning: 'Submission saved but email failed. Adviser can check dashboard.' })
  }
}
