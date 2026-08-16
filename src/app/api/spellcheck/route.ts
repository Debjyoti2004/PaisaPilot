import { NextRequest, NextResponse } from 'next/server'
import { getSpeller } from '@/lib/spellcheck-server'

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('word') ?? ''

  if (!word || word.length < 3 || /^[\d\s\W]+$/.test(word)) {
    return NextResponse.json({ correct: true, suggestions: [] })
  }

  try {
    const speller = getSpeller()
    const correct = speller.correct(word)
    const suggestions = correct ? [] : speller.suggest(word).slice(0, 5)
    return NextResponse.json({ correct, suggestions }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch {
    return NextResponse.json({ correct: true, suggestions: [] })
  }
}
