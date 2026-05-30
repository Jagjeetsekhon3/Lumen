import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req) {
  try {
    const { brief, genre, tone, duration, scenes, brandSummary, projectName } = await req.json()

    const prompt = `You are a senior creative director and video scriptwriter. Write a complete, professional video script based on this brief.

PROJECT: ${projectName || 'Unknown'}
BRAND CONTEXT: ${brandSummary || 'No brand context — write a high-quality generic script.'}

BRIEF: ${brief}
GENRE: ${genre}
TONE: ${tone}
DURATION: ${duration}
NUMBER OF SCENES: ${scenes}

Write a complete scene-by-scene video script. For each scene include:
- Scene number and title
- Duration suggestion
- Location/setting
- Action — what happens, who does what
- Visual direction — camera, lighting, mood
- Any dialogue or VO (if relevant)
- Music/sound cues (optional)

Format it clearly so it can be pasted directly into the Frames tab or Script to Video tab.

Make it production-ready. Specific, visual, cinematic. Brand context should influence the visual language and tone throughout.

Write the full script now:`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ script: message.content[0].text.trim() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
