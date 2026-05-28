import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { brandSummary, projectName, product, copy, format, mood, refs } = await req.json()

    const refSummary = refs?.length > 0
      ? refs.map(r => `${r.tag}: ${r.url}`).join('\n')
      : 'No visual references'

    const prompt = `You are a senior art director and ChatGPT image prompt specialist. Generate a complete, detailed prompt for ChatGPT image generation that will produce a full, print-ready design.

PROJECT: ${projectName || 'Unknown'}

BRAND CONTEXT:
${brandSummary || 'No brand summary provided.'}

DESIGN BRIEF:
- Product/Subject: ${product || 'Not specified'}
- Format: ${format}
- Copy/Text in design: ${copy || 'None specified'}
- Mood/Direction: ${mood || 'Not specified'}

VISUAL REFERENCES:
${refSummary}

Generate a single comprehensive ChatGPT prompt that covers ALL of these elements in one shot:
1. COMPOSITION — layout, placement of product, text zones, visual hierarchy
2. PRODUCT TREATMENT — how the product/subject looks, lighting, angle, finish
3. BACKGROUND — what's behind the product, environment, texture, color
4. TYPOGRAPHY — font style (serif/sans/display), weight, size hierarchy, placement, color
5. COLOR PALETTE — exact mood, dominant colors, accent colors
6. COPY PLACEMENT — where headlines, sublines, CTAs sit in the frame
7. OVERALL MOOD — lighting, atmosphere, feeling
8. TECHNICAL — mention the format dimensions and that it should be a complete ready-to-use design

Write it as one flowing, detailed paragraph starting with "Create a complete [format] design..." 
Be extremely specific. This prompt goes directly into ChatGPT to generate the final design.
Return ONLY the prompt. No explanation, no preamble.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ prompt: message.content[0].text.trim() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
