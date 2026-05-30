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

VISUAL FILTERS — apply to every single prompt:
- Camera: ${camera}
- Aspect ratio: ${ratio}
- Theme/mood: ${theme}
- Color grading: ${grading}
- Image tool: ${imageTool}
- Video tool: ${videoTool}

VIDEO SCRIPT:
${script}

IMPORTANT: Even if the script is very short (single words, short phrases, or a list), treat each line or beat as a separate scene. Always generate at least 3 scenes even for very short scripts.

For each scene generate:
1. IMAGE PROMPT — for ${imageTool}. Detailed still-frame description. Include camera type (${camera}), aspect ratio (${ratio}), theme (${theme}), color grading (${grading}). Minimum 30 words. Ready to paste.
2. VIDEO PROMPT — for ${videoTool}. Motion description, camera movement, duration, atmosphere. Include theme and grading. Minimum 20 words. Ready to paste.

CRITICAL: Return ONLY a valid JSON object. No markdown, no backticks, no explanation before or after. Start with { and end with }.

{
  "frames": [
    {
      "scene": 1,
      "title": "Short scene title",
      "duration": "3s",
      "camera": "${camera}",
      "description": "What happens in this scene",
      "imagePrompt": "Complete ${imageTool} image prompt with all visual filters applied",
      "videoPrompt": "Complete ${videoTool} video prompt with motion direction and filters"
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = message.content[0].text.trim()

    // Strip any markdown fences if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

    // Extract JSON if there's any text before/after
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.slice(jsonStart, jsonEnd + 1)
    }

    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Frames API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
