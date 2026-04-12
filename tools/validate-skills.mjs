import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

const skillsRoot = join(process.cwd(), 'packages', 'skills-catalog', 'skills')
const kebabPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) {
    return { ok: false, metadata: {}, error: 'Missing frontmatter delimiters' }
  }

  const metadata = {}
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (!field) continue
    const [, key, rawValue] = field
    metadata[key] = rawValue.replace(/^["']|["']$/g, '')
  }
  return { ok: true, metadata, error: null }
}

function validateSkill(skillPath) {
  const errors = []
  const warnings = []
  const folderName = basename(skillPath)
  const entries = readdirSync(skillPath)
  const skillFile = join(skillPath, 'SKILL.md')

  if (!kebabPattern.test(folderName)) errors.push(`Folder is not kebab-case: ${folderName}`)
  if (!entries.includes('SKILL.md')) errors.push('Missing SKILL.md')
  if (entries.some((entry) => entry.toLowerCase() === 'readme.md')) warnings.push('Skill folder should not include README.md')
  if (!existsSync(skillFile)) return { errors, warnings }

  const content = readFileSync(skillFile, 'utf8')
  const { ok, metadata, error } = parseFrontmatter(content)
  if (!ok) errors.push(error)

  if (!metadata.name) errors.push('Missing frontmatter name')
  if (metadata.name && metadata.name !== folderName) warnings.push(`Frontmatter name does not match folder: ${metadata.name}`)
  if (metadata.name && !kebabPattern.test(metadata.name)) errors.push(`Frontmatter name is not kebab-case: ${metadata.name}`)
  if (!metadata.description) errors.push('Missing frontmatter description')
  if (metadata.description && metadata.description.length > 1024) errors.push('Description is longer than 1024 characters')
  if (metadata.description && !/use when|trigger/i.test(metadata.description)) {
    warnings.push('Description should include trigger guidance')
  }
  if (metadata.description && !/do not use/i.test(metadata.description)) {
    warnings.push('Description should include negative scope guidance')
  }

  const body = content.replace(/^---\n[\s\S]*?\n---\n/, '')
  const bodyLines = body.trim().split(/\r?\n/).filter(Boolean).length
  if (bodyLines > 500) warnings.push(`SKILL.md body is long: ${bodyLines} lines`)

  const referencesPath = join(skillPath, 'references')
  if (existsSync(referencesPath) && statSync(referencesPath).isDirectory()) {
    for (const ref of readdirSync(referencesPath)) {
      if (!body.includes(ref) && !body.includes(`references/${ref}`)) {
        warnings.push(`references/${ref} is not referenced in SKILL.md`)
      }
    }
  }

  return { errors, warnings }
}

if (!existsSync(skillsRoot)) {
  console.error(`Missing skills root: ${skillsRoot}`)
  process.exit(1)
}

let failed = 0
let checked = 0

for (const category of readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!category.isDirectory()) continue
  const categoryPath = join(skillsRoot, category.name)

  for (const skill of readdirSync(categoryPath, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue
    const skillPath = join(categoryPath, skill.name)
    const result = validateSkill(skillPath)
    checked += 1

    const label = `${basename(dirname(skillPath))}/${basename(skillPath)}`
    if (result.errors.length === 0) {
      console.log(`OK ${label}`)
    } else {
      failed += 1
      console.error(`FAIL ${label}`)
      for (const error of result.errors) console.error(`  error: ${error}`)
    }
    for (const warning of result.warnings) console.warn(`  warning: ${warning}`)
  }
}

console.log(`Checked ${checked} skill(s)`)
process.exit(failed === 0 ? 0 : 1)
