# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run validate           # Validate all skill folders and frontmatter
npm run generate:registry  # Regenerate skills-registry.json from current skill files
```

Run `validate` after adding or modifying any skill. Run `generate:registry` after any change that should be reflected in the registry (new skill, updated frontmatter, renamed files).

## Repository Structure

This is a personal AI agent skills catalog. Skills are installed into Claude Code and invoked as slash commands.

```
packages/skills-catalog/skills/
  _category.json              # Registry of valid category folders
  deprecated.yaml             # Skills removed with migration notes
  (category-name)/            # Category folder — parentheses are required
    skill-name/               # Kebab-case skill folder
      SKILL.md                # Required — defines the skill
      references/             # Optional supporting docs loaded on demand
      templates/              # Optional code/file templates
```

The generated output lives at `packages/skills-catalog/skills-registry.json` — do not edit it by hand.

## Skill Authoring Rules

Every `SKILL.md` must start with YAML frontmatter:

```markdown
---
name: skill-name          # must match the folder name exactly (kebab-case)
description: ...          # max 1024 chars; must include trigger guidance and negative scope
license: CC-BY-4.0
metadata:
  author: Yan
  version: "0.1.0"
---
```

`validate` enforces these constraints:
- `name` is kebab-case and matches the folder name
- `description` contains the words "use when" or "trigger" (positive trigger guidance)
- `description` contains "do not use" (negative scope guidance)
- No `README.md` inside a skill folder (use `SKILL.md` only)
- Every file in `references/` is referenced somewhere in the `SKILL.md` body

## Adding a New Category

Add an entry to `packages/skills-catalog/skills/_category.json` with the folder name (including parentheses) as the key, then create the `(category-name)/` folder. Predefined categories: `(development)`, `(architecture)`, `(quality)`, `(tooling)`.

## Deprecating a Skill

Add an entry to `packages/skills-catalog/skills/deprecated.yaml`:

```yaml
- name: old-skill-name
  message: Human-readable reason for deprecation
```

## Changelog

Every change that touches a skill, the installer, or the catalog tooling must include a `CHANGELOG.md` update. The PR pipeline enforces this — merges to `main` are blocked if `CHANGELOG.md` was not modified.

- Add new entries under the `## [Unreleased]` section.
- Use the appropriate subsection: `Added`, `Changed`, `Fixed`, or `Removed`.
- When a version is released, replace `[Unreleased]` with the version and date and add a fresh `## [Unreleased]` section above it.

Format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).
