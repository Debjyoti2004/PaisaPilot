// Server-only — never imported client-side
import path from 'path'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NSpell = require('nspell')

interface Speller {
  correct(word: string): boolean
  suggest(word: string): string[]
}

let instance: Speller | null = null

export function getSpeller(): Speller {
  if (instance) return instance

  // Read .aff / .dic directly from node_modules — avoids ESM import.meta.url issues with dictionary-en
  const base = path.join(process.cwd(), 'node_modules', 'dictionary-en')
  const aff = fs.readFileSync(path.join(base, 'index.aff'))
  const dic = fs.readFileSync(path.join(base, 'index.dic'))

  instance = NSpell(aff, dic) as Speller
  return instance
}
