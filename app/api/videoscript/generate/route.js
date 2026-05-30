import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { script, tool, brandSummary, refs, projectName } = await req.json()

    const refSummary = refs?.length > 0
      ? refs.map(r => `${r.tag}: ${r.url}`).join('\n')
      : 'No visual references'

    const toolInstructions = {
      'Kling': 'Kling prompt style: scene description, camera movement, mood, lighting, duration (max 10s). Be cinematic and specific.',
      'Seedance': 'Seedance prompt style: vivid scene description with motion direction, atmosphere, camera angle.',
      'Runway': 'Runway Gen-3 style: start with camera action, describe motion, lighting, mood. Mention duration.',
      'Google VEO': 'Google VEO style: cinematic description, camera movement, lighting setup, duration.',
      'Grok': 'Grok video style: scene description, visual mood, motion cues, atmosphere.',
      'Minimax': 'Minimax style: detailed scene with character action, camera, lighting, duration.',
      'Sora': 'Sora style: rich cinematic description, camera movement, aspect ratio, duration.',
      'Wan': 'Wan style: scene description with motion, mood, lighting direction.',
    }

    const prompt = `You are a professional video director and AI prompt engineer. Read this video script and break it into individual scenes. For each scene, generate a ${tool} video prompt.

PROJECT: ${projectName || 'Unknown'}

BRAND CONTEXT:
${brandSummary || 'No brand context — generate cinematic prompts.'}

VISUAL REFERENCES:
${refSummary}

VIDEO SCRIPT:
${script}

TOOL: ${tool}
TOOL STYLE: ${toolInstructions[tool] || 'Detailed cinematic description with camera and mood.'}

Instructions:
- Break the script into logical scenes (3-8 scenes typically)
- Each scene gets its own prompt
- Use brand context to inform visual style, colors, mood
- Be very specific about camera angles, lighting, motion
- Include duration suggestion per scene

Return ONLY valid JSON, no markdown:
{
  "scenes": [
    {
      "scene": 1,
      "title": "Short scene title",
      "duration": "3s",
      "camera": "Close-up / Wide / Medium etc",
      "description": "What happens in this scene from the script",
      "visual": "Art direction — lighting, color, mood, atmosphere",
      "prompt": "The complete ready-to-paste ${tool} prompt for this scene"
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
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
