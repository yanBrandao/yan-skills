#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const skillsSource = join(__dirname, '..', 'packages', 'skills-catalog', 'skills')
const skillsDest = join(homedir(), '.claude', 'skills')

if (!existsSync(skillsDest)) {
  mkdirSync(skillsDest, { recursive: true })
}

let installed = 0

for (const categoryEntry of readdirSync(skillsSource, { withFileTypes: true })) {
  if (!categoryEntry.isDirectory()) continue
  const categoryPath = join(skillsSource, categoryEntry.name)

  for (const skillEntry of readdirSync(categoryPath, { withFileTypes: true })) {
    if (!skillEntry.isDirectory()) continue
    const src = join(categoryPath, skillEntry.name)
    const dest = join(skillsDest, skillEntry.name)

    const resolvedSrc = realpathSync(src)
    const resolvedDest = existsSync(dest) ? realpathSync(dest) : dest
    if (resolvedSrc === resolvedDest) {
      console.log(`skipped (already linked): ${skillEntry.name}`)
      continue
    }

    cpSync(src, dest, { recursive: true, force: true })
    console.log(`installed: ${skillEntry.name} → ${dest}`)
    installed++
  }
}

console.log(`\n${installed} skill(s) installed to ${skillsDest}`)
