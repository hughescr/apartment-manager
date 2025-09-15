# Apartment Manager Engineering Guide

This handbook captures the shared expectations for anyone working in the Apartment Manager codebase, regardless of assistant platform. Assistant-specific behaviours live beside this document; see `CLAUDE.md` or `CODEX.md` for details unique to each environment.

## Shared Development Principles

1. Prefer the existing toolchain (`bun`, SST, Astro) and avoid introducing new ecosystems without discussion.
2. Fix TypeScript issues properly—do not rely on `@ts-ignore` or similar escapes.
3. Keep formatting consistent with the repository conventions (`if(condition)` style, 4-space indentation).
4. Practise test-driven development where practical; add or adjust tests when behaviour changes.
5. Edit existing files in place unless a new file is clearly required.
6. Honour the implementation plan and scope—complete what is asked, no more, no less.

## Project Overview

**Tech Stack:** Astro + Alpine.js frontend, SST/AWS backend, DynamoDB/S3 storage, TypeScript/Bun tooling.
**Architecture:** Data layer (`data/`) → API (`api/`) → Frontend (`astro-src/`).
**Additional Areas:** Automation scripts (`src/automation/`), mapping utilities (`src/mappers/`).

## Development Guidelines

- TypeScript runs in strict mode; treat compiler feedback as actionable bugs. Ignore noise from `.sst/` artefacts—the SST framework maintains those.
- Use the repository formatting rules (ESLint, Prettier) and respect existing patterns such as `if(condition)` and 4-space indentation.
- Follow a TDD mindset. When altering behaviour, update or extend tests alongside code.
- Coordinate changes with the documented implementation plan (`IMPLEMENTATION_PLAN.md`).

## Running the Project

- `bun install` – Install dependencies.
- `bun run sst-dev` – Launch the SST development environment (preferred over `bun run dev`).
- `bun run full-test` – Execute the full validation suite.
- `bun run sst-diagnostics` – Run SST diagnostics.

Background watchers (SST dev server, TypeScript checker, Astro checker, test watcher) are available via tmux workflows. Assistant-specific guidance explains when and how to use them.

AWS credentials are injected by automation scripts; avoid hardcoding secrets and prefer AWS Secrets Manager.

## Security

- Never commit credentials or sensitive information.
- Validate inputs at the API and data layers.
- Review changes for common vulnerabilities (OWASP) before merging.

## AWS Services

- Lambda for compute
- CloudFront for distribution
- DynamoDB for persistence
- Secrets Manager for configuration

## Module Guidelines

Each major directory includes specialised notes—see the module-specific `AGENTS.md` files under `/data/`, `/api/`, `/astro-src/`, and `/sst/`.

## Resources

- Check `IMPLEMENTATION_PLAN.md` for current priorities.
- Use the documentation tooling (`mcp__documentation`, READMEs, external docs) to clarify framework behaviour.
- Reference `FLOORPLAN_TESTING_GUIDE.md`, `docs/`, and module guides for domain knowledge.
