import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { script, videoTool, imageTool, camera, ratio, theme, grading, brandSummary, refs, projectName } = await req.json()

    const refSummary = refs?.length > 0 ? refs.map(r => `${r.tag}: ${r.url}`).join('\n') : 'None'

    const prompt = `You are a professional video director and AI prompt engineer. Read this video script and generate both an IMAGE PROMPT and a VIDEO PROMPT for each scene.

PROJECT: ${projectName || 'Unknown'}
BRAND CONTEXT: ${brandSummary || 'None provided.'}
VISUAL REFERENCES: ${refSummary}

VISUAL FILTERS TO APPLY TO EVERY PROMPT:
- Camera: ${camera}
- Aspect ratio: ${ratio}
- Theme/mood: ${theme}
- Color grading: ${grading}
- Image tool: ${imageTool}
- Video tool: ${videoTool}

VIDEO SCRIPT:
${script}

For each scene generate:
1. IMAGE PROMPT — for ${imageTool}. Detailed still-frame description. Include camera type, aspect ratio, theme, grading, brand context. Ready to paste.
2. VIDEO PROMPT — for ${videoTool}. Motion description, camera movement, duration, atmosphere. Include the theme and grading. Ready to paste.

Return ONLY valid JSON, no markdown:
{
  "frames": [
    {
      "scene": 1,
      "title": "Short scene title",
      "duration": "3s",
      "camera": "${camera}",
      "description": "What happens in this scene",
      "imagePrompt": "Complete ${imageTool} image prompt with all filters applied",
      "videoPrompt": "Complete ${videoTool} video prompt with motion and filters"
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
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
