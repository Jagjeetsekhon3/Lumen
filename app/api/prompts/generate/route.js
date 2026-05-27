import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { brandSummary, refs, idea, outputType, tool, projectName } = await req.json()

    const refSummary = refs?.length > 0
      ? refs.map(r => `${r.tag}: ${r.url}`).join(', ')
      : 'No visual references provided'

    const toolInstructions = {
      'Midjourney v6': 'End with --ar [ratio] --style raw --v 6. Use comma-separated descriptors.',
      'DALL-E 3': 'Write as a detailed paragraph description. Be specific about style, lighting, composition.',
      'Stable Diffusion XL': 'Use comma-separated tags. Include negative prompt suggestion at end.',
      'Ideogram': 'Descriptive paragraph style. Mention if text should appear in image.',
      'Flux': 'Detailed descriptive style. Focus on photorealism cues.',
      'Runway Gen-3': 'Start with camera movement. Describe action, lighting, mood, duration.',
      'Kling': 'Describe scene, motion, camera angle. Mention duration (max 10s).',
      'Seedance': 'Scene description with camera direction. Include motion style.',
      'Sora': 'Cinematic description. Include camera movement, duration, aspect ratio.',
      'Pika': 'Short punchy description with motion cues. Mention loop if needed.',
    }

    const prompt = `You are a professional prompt engineer specialising in AI image and video generation for advertising.

Generate a single, ready-to-use ${outputType} prompt for ${tool}.

PROJECT: ${projectName || 'Unknown'}

BRAND CONTEXT:
${brandSummary || 'No brand summary — create a high-quality generic prompt.'}

VISUAL REFERENCES:
${refSummary}

CAMPAIGN IDEA / BRIEF:
${idea || 'No specific idea — generate a strong brand-aligned visual.'}

OUTPUT TYPE: ${outputType}
TOOL: ${tool}
TOOL INSTRUCTIONS: ${toolInstructions[tool] || 'Write a detailed, specific prompt.'}

Return ONLY the prompt text. No explanation, no preamble, no quotes. Just the prompt ready to paste.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ prompt: message.content[0].text.trim() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
