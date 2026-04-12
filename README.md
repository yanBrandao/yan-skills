# yan-skills

Personal agent skills catalog for my own backend, architecture, and workflow conventions.

This repository uses this catalog shape:

```text
packages/skills-catalog/skills/
  (category-name)/
    skill-name/
      SKILL.md
      references/
      templates/
```

## Skills

- `kotlin-backend-ddd`: Kotlin Spring Boot backend structure using DDD, ports, services, and adapters.

## Commands

```bash
npm run validate
npm run generate:registry
```

`validate` checks the skill folders and frontmatter. `generate:registry` writes
`packages/skills-catalog/skills-registry.json` so other tooling can discover the
catalog.
