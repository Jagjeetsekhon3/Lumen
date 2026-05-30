import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { scene, sceneNum, tool, brandSummary, refs } = await req.json()

    const refSummary = refs?.length > 0
      ? refs.map(r => `${r.tag}: ${r.url}`).join('\n')
      : 'No visual references'

    const prompt = `Generate a fresh ${tool} video prompt for this scene.

SCENE ${sceneNum}: ${scene}

BRAND CONTEXT:
${brandSummary || 'No brand context.'}

VISUAL REFERENCES:
${refSummary}

Return ONLY the prompt text. No explanation, no preamble. Make it different from a typical first attempt — try a different camera angle or lighting approach.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ prompt: message.content[0].text.trim() })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
