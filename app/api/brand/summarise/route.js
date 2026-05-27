import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { brandSummary, guidelinesUrl, approvedPostUrls = [], projectName, fileName } = await req.json()

    const content = []
    content.push({ type: 'text', text: `You are a senior brand strategist. Analyse this brand's guidelines and approved posts, then write a concise, structured Brand Summary that will be used as AI context for creative campaign work.\n\nProject: ${projectName || 'Unknown'}\n\nWrite the summary in this format:\n\nBRAND PERSONALITY: [2-3 sentences on tone, values, voice]\nVISUAL IDENTITY: [colors, typography, layout style, photography style]\nDO'S: [3-4 key creative rules]\nDON'TS: [3-4 things to avoid]\nEXECUTION PATTERNS: [what the brand actually looks like in real posts]\nCONTENT THEMES: [recurring topics, product treatments, messaging angles]\nTARGET AUDIENCE: [who this is for]\n\nBe specific and actionable. This summary will be injected into every AI call.` })

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
            content.push({ type: 'text', text: `Guidelines URL: ${guidelinesUrl}` })
          }
        }
      } catch (e) {
        content.push({ type: 'text', text: `Guidelines uploaded: ${guidelinesUrl}` })
      }
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
