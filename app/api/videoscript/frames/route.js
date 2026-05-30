import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req) {
  try {
    const { script, videoTool, imageTool, camera, ratio, theme, grading, brandSummary, refs, projectName } = await req.json()

    const refSummary = refs?.length > 0 ? refs.map(r => `${r.tag}: ${r.url}`).join('\n') : 'None'

    const prompt = `You are a video director and prompt engineer. Read this script and generate an IMAGE PROMPT and VIDEO PROMPT for each scene.

PROJECT: ${projectName || 'Unknown'}
BRAND: ${brandSummary || 'None.'}

FILTERS (apply to every prompt):
Camera: ${camera} | Ratio: ${ratio} | Theme: ${theme} | Grading: ${grading}

SCRIPT:
${script}

Rules:
- Extract 3-6 scenes from the script
- Each scene needs one image prompt for ${imageTool} and one video prompt for ${videoTool}
- Apply all filters to every prompt
- Keep each prompt under 60 words
- Return ONLY valid JSON starting with { no markdown

{"frames":[{"scene":1,"title":"Scene title","duration":"3s","camera":"${camera}","description":"what happens","imagePrompt":"${imageTool} prompt here with all filters","videoPrompt":"${videoTool} motion prompt here"}]}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = message.content[0].text.trim()
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.slice(jsonStart, jsonEnd + 1)
    }

    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Frames error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
