import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = req.query.key
  const expected = process.env.SETUP_KEY || 'marketpartners2024'
  if (key !== expected) {
    return res.status(403).json({ error: 'Add ?key=YOUR_SETUP_KEY to the URL' })
  }

  const resendKey = process.env.RESEND_API_KEY
  const toEmail   = process.env.RESEND_TO_EMAIL || 'portfolio@marketpartners.com.au'

  if (!resendKey) {
    return res.status(400).json({ error: 'RESEND_API_KEY is not set' })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendKey)
    const result = await resend.emails.send({
      from: 'Market Partners Intake <onboarding@resend.dev>',
      to: [toEmail],
      subject: 'Test email from Market Partners intake system',
      html: '<p>Test email — if you received this, email sending is working correctly.</p>',
    })
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error })
    }
    return res.json({ success: true, message: `Email sent to ${toEmail}`, emailId: result.data?.id })
  } catch (err: any) {
    return res.status(500).json({ success: false, exception: err?.message || String(err) })
  }
}
