import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { imageUrl, motionStyle, duration, mood, tool, brandSummary, projectName } = await req.json()

    const toolInstructions = {
      'Kling': 'Kling style: describe subject, camera movement, motion speed, atmosphere. Keep under 150 words.',
      'Seedance': 'Seedance style: vivid motion description, camera direction, mood, visual energy.',
      'Runway': 'Runway Gen-3 style: start with camera action verb (zoom, pan, dolly), describe motion and mood.',
      'Google VEO': 'Google VEO style: cinematic description, camera movement type, lighting change if any.',
      'Grok': 'Grok video style: motion description, atmosphere, camera behavior.',
      'Minimax': 'Minimax style: subject motion + camera motion, mood, duration.',
      'Sora': 'Sora style: rich cinematic description, camera movement, aspect ratio note.',
      'Wan': 'Wan style: motion direction, mood, camera angle, atmosphere.',
    }

    const prompt = `You are a professional video director specialising in image-to-video animation. Generate a ${tool} prompt that animates a still image.

PROJECT: ${projectName || 'Unknown'}
BRAND CONTEXT: ${brandSummary || 'No brand context.'}

IMAGE URL: ${imageUrl}

MOTION BRIEF:
- Motion style: ${motionStyle}
- Duration: ${duration}
- Mood/atmosphere: ${mood || 'cinematic, professional'}

TOOL: ${tool}
TOOL STYLE: ${toolInstructions[tool] || 'Detailed motion description with camera direction.'}

Generate 2 prompt variations — one faithful to the motion brief, one that pushes it creatively.

Return ONLY valid JSON, no markdown:
{
  "prompts": [
    {
      "note": "Faithful to brief",
      "prompt": "The complete ${tool} prompt"
    },
    {
      "note": "Creative variation",
      "prompt": "Alternative approach with different energy"
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
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
