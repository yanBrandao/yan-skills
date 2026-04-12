import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const skillsRoot = join(process.cwd(), 'packages', 'skills-catalog', 'skills')
const outputFile = join(process.cwd(), 'packages', 'skills-catalog', 'skills-registry.json')

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return {}

  const metadata = {}
  let parentKey = null
  for (const line of match[1].split(/\r?\n/)) {
    const nested = line.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (nested && parentKey) {
      const [, key, rawValue] = nested
      metadata[`${parentKey}.${key}`] = rawValue.replace(/^["']|["']$/g, '')
      continue
    }

    const field = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (!field) continue
    const [, key, rawValue] = field
    metadata[key] = rawValue.replace(/^["']|["']$/g, '')
    parentKey = rawValue === '' ? key : null
  }
  return metadata
}

function listFiles(dir, baseDir = dir) {
  const result = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath, baseDir))
    } else {
      result.push(relative(baseDir, fullPath).replace(/\\/g, '/'))
    }
  }
  return result.sort()
}

function hashSkill(skillPath, files) {
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file)
    hash.update(readFileSync(join(skillPath, file)))
  }
  return hash.digest('hex')
}

function categoryId(folderName) {
  const match = folderName.match(/^\(([^)]+)\)$/)
  return match?.[1] ?? null
}

function loadDeprecated() {
  const path = join(skillsRoot, 'deprecated.yaml')
  if (!existsSync(path)) return []
  const content = readFileSync(path, 'utf8').trim()
  if (!content || content === '[]') return []

  const entries = []
  let current = null
  for (const line of content.split(/\r?\n/)) {
    const name = line.match(/^- name:\s*(.+)$/)
    const message = line.match(/^\s+message:\s*(.+)$/)
    if (name) {
      current = { name: name[1].trim() }
      entries.push(current)
    } else if (message && current) {
      current.message = message[1].trim()
    }
  }
  return entries.filter((entry) => entry.name && entry.message)
}

const categoriesByFolder = readJson(join(skillsRoot, '_category.json'), {})
const categories = {}
const skills = []

for (const categoryFolder of readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!categoryFolder.isDirectory()) continue
  const id = categoryId(categoryFolder.name)
  if (!id) continue

  categories[id] = categoriesByFolder[categoryFolder.name] ?? { name: id }
  const categoryPath = join(skillsRoot, categoryFolder.name)

  for (const skillFolder of readdirSync(categoryPath, { withFileTypes: true })) {
    if (!skillFolder.isDirectory()) continue
    const skillPath = join(categoryPath, skillFolder.name)
    const skillFile = join(skillPath, 'SKILL.md')
    if (!existsSync(skillFile)) continue

    const frontmatter = parseFrontmatter(readFileSync(skillFile, 'utf8'))
    const files = listFiles(skillPath)
    skills.push({
      name: frontmatter.name || skillFolder.name,
      description: frontmatter.description || '',
      category: id,
      path: `${categoryFolder.name}/${skillFolder.name}`,
      files,
      author: frontmatter.author || frontmatter['metadata.author'] || undefined,
      version: frontmatter.version || frontmatter['metadata.version'] || undefined,
      contentHash: hashSkill(skillPath, files),
    })
  }
}

const registry = {
  version: '1.0.0',
  categories,
  skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
}

const deprecated = loadDeprecated()
if (deprecated.length > 0) registry.deprecated = deprecated

writeFileSync(outputFile, `${JSON.stringify(registry, null, 2)}\n`)
console.log(`Generated ${outputFile}`)
console.log(`Skills: ${registry.skills.length}`)
