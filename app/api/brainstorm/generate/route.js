import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { brief, brandSummary, projectName } = await req.json()

    const prompt = `You are a Creative Director at a top advertising agency. Generate campaign ideas based on the brief below, filtered through the brand context.

PROJECT: ${projectName || 'Unknown'}

BRAND CONTEXT:
${brandSummary || 'No brand summary available — generate general creative ideas.'}

BRIEF:
${brief}

Generate exactly 4 ideas in this JSON format (return ONLY valid JSON, no markdown):
{
  "ideas": [
    {
      "label": "Territory 01",
      "title": "Short punchy territory name",
      "body": "2-3 sentences describing the creative territory, visual language, and tone. Be specific and inspiring."
    },
    {
      "label": "Territory 02",
      "title": "...",
      "body": "..."
    },
    {
      "label": "Tagline Pack",
      "title": "5 tagline options",
      "body": "Five taglines separated by · — each short, punchy, on-brand."
    },
    {
      "label": "Concept",
      "title": "Campaign concept name",
      "body": "A specific, executable campaign concept — format, platform, duration, what the content looks like."
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
