import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req) {
  try {
    const { guidelinesUrl, guidelinesText, approvedPostUrls = [], projectName, fileName } = await req.json()

    const content = []

    content.push({
      type: 'text',
      text: `You are a senior brand strategist. Analyse this brand's guidelines and write a concise, structured Brand Summary that will be used as AI context for creative campaign work.

PROJECT: ${projectName || 'Unknown'}

Write the summary in this format:

BRAND PERSONALITY: [2-3 sentences on tone, values, voice]
VISUAL IDENTITY: [colors, typography, layout style, photography style]
DO'S: [3-4 key creative rules]
DON'TS: [3-4 things to avoid]
EXECUTION PATTERNS: [what the brand actually looks like in real posts]
CONTENT THEMES: [recurring topics, product treatments, messaging angles]
TARGET AUDIENCE: [who this is for]

Be specific and actionable. This summary will be injected into every AI call.`
    })

    // Option 1 — PDF/file upload
    if (guidelinesUrl) {
      try {
        const response = await fetch(guidelinesUrl)
        if (response.ok) {
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const contentType = response.headers.get('content-type') || 'application/pdf'
          if (contentType.includes('pdf') || fileName?.endsWith('.pdf')) {
            content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } })
          } else {
            content.push({ type: 'text', text: `Guidelines file URL: ${guidelinesUrl}` })
          }
        }
      } catch (e) {
        content.push({ type: 'text', text: `Guidelines available at: ${guidelinesUrl}` })
      }
    }

    // Option 2 — Pasted text
    if (guidelinesText) {
      content.push({
        type: 'text',
        text: `BRAND GUIDELINES TEXT:\n\n${guidelinesText}`
      })
    }

    // Option 3 — Approved posts context
    if (approvedPostUrls.length > 0) {
      content.push({
        type: 'text',
        text: `APPROVED POST IMAGES (${approvedPostUrls.length} posts):\n${approvedPostUrls.slice(0, 5).join('\n')}\n\nAnalyse these to extract real execution patterns.`
      })
    }

    if (content.length === 1) {
      content.push({ type: 'text', text: 'No guidelines provided. Generate a placeholder summary noting that brand guidelines need to be uploaded.' })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content }],
    })

    return NextResponse.json({ summary: message.content[0].text })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
