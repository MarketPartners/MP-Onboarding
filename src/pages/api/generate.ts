import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../lib/auth'
import { buildDocument } from '../../lib/docGenerator'
import { FullFormData } from '../../lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await requireAuth(req, res, 'adviser')
  if (!session) return

  const data: FullFormData = req.body
  const buffer = await buildDocument(data)

  const c1Last = data.c1_last || 'Client'
  const c2Last = data.c2_last || ''
  const filename = [c1Last, c2Last].filter(Boolean).join('_') + '_Investment_Program.docx'

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
}
