import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { refs } = await req.json()

    const taggedRefs = refs.map(r => `- ${r.tag.toUpperCase()}: ${r.url}`).join('\n')

    const prompt = `You are a Creative Director and Art Director. Based on the following tagged reference images, write a concise Visual Language Brief.

REFERENCES:
${taggedRefs}

Write a 2-3 sentence Visual Language Brief that captures:
- The overall aesthetic and mood
- Typography and layout direction
- Color and lighting approach
- How the product/subject should be treated

Write it as a direct creative brief, not a list. Be specific and use industry-standard art direction language. Keep it under 60 words.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ brief: message.content[0].text })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
