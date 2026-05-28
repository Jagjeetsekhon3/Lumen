import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { brandSummary, projectName, product, copy, format, mood, designRefs, refs } = await req.json()

    // Build reference descriptions
    const refDescriptions = {
      typography: designRefs?.typography?.url
        ? `IMAGE REFERENCE (see url: ${designRefs.typography.url})`
        : designRefs?.typography?.text || 'Not specified',
      background: designRefs?.background?.url
        ? `IMAGE REFERENCE (see url: ${designRefs.background.url})`
        : designRefs?.background?.text || 'Not specified',
      product: designRefs?.product?.url
        ? `IMAGE REFERENCE (see url: ${designRefs.product.url})`
        : designRefs?.product?.text || 'Not specified',
      color: designRefs?.color?.url
        ? `IMAGE REFERENCE (see url: ${designRefs.color.url})`
        : designRefs?.color?.text || 'Not specified',
    }

    const prompt = `You are a senior art director and ChatGPT image prompt specialist. Generate a complete, detailed prompt for ChatGPT image generation that produces a full, print-ready design.

PROJECT: ${projectName || 'Unknown'}

BRAND CONTEXT:
${brandSummary || 'No brand summary provided.'}

DESIGN BRIEF:
- Product/Subject: ${product || 'Not specified'}
- Format: ${format}
- Copy/Text in design: ${copy || 'None specified'}
- Overall Mood: ${mood || 'Not specified'}

VISUAL REFERENCE DIRECTIONS:
- Typography style: ${refDescriptions.typography}
- Background treatment: ${refDescriptions.background}
- Product treatment: ${refDescriptions.product}
- Color palette: ${refDescriptions.color}

Generate ONE comprehensive ChatGPT prompt covering ALL elements:
1. COMPOSITION — layout, placement, visual hierarchy
2. PRODUCT TREATMENT — angle, lighting, finish, position
3. BACKGROUND — environment, texture, depth, color
4. TYPOGRAPHY — font style, weight, size hierarchy, placement, color
5. COPY PLACEMENT — where headline, subline, CTA sit in frame
6. COLOR PALETTE — dominant colors, accents, contrast
7. OVERALL MOOD — lighting, atmosphere
8. TECHNICAL — format dimensions, complete ready-to-use design

If image references are provided, describe extracting their visual style (colors, composition, mood) and applying to this design.

Write as one flowing paragraph starting with "Create a complete ${format} design..."
Be extremely specific. Return ONLY the prompt — no explanation, no preamble.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ prompt: message.content[0].text.trim() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
