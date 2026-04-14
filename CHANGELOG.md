# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions workflow (`.github/workflows/validate-pr.yml`) that blocks merges to `main` when `CHANGELOG.md` was not updated and when skill frontmatter validation fails.
- Changelog authoring rule in `CLAUDE.md` requiring every PR to include a `CHANGELOG.md` entry.

## [0.1.0] - 2026-04-14

### Added

- `npx yan-skills` installer that copies all skills to `~/.claude/skills/` so Claude Code picks them up automatically. Skips entries already linked to the same source path.
- `CLAUDE.md` with repository overview, authoring commands, skill structure rules, and category/deprecation conventions.
- `kotlin-backend-ddd` skill with MockMvc controller test patterns covering `201 Created`, `200 OK`, `404 Not Found`, `403 Forbidden`, and `401 Unauthorized` using `@WebMvcTest` and `@WithMockUser`.
- `instancio-kotlin` test data generation patterns using `KInstancio.create<T>()` and `KInstancio.of<T>().set(field(...), value).create()`.
- `mockito-kotlin` test patterns replacing `mockk`: `whenever().thenReturn()`, `doNothing().whenever()`, `verify()`, `argumentCaptor`, and exception stubbing.
- `kotlin-backend-ddd` skill with DDD package layout, layer rules, service/domain/port/adapter patterns, and mandatory unit test guidance for Kotlin Spring Boot projects.
- Skills catalog structure under `packages/skills-catalog/skills/` with category folders, `_category.json`, and `deprecated.yaml`.
- `validate` script to enforce skill frontmatter rules (kebab-case name, trigger/negative-scope description, no README, all references cited).
- `generate:registry` script to produce `skills-registry.json` from current skill files.

[Unreleased]: https://github.com/yanBrandao/yan-skills/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yanBrandao/yan-skills/releases/tag/v0.1.0
