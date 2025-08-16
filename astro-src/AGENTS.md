# Frontend (Astro) Agent Guidelines

## CRITICAL RULES

1. **Use astro-sst adapter** - No standard adapters
2. **Use Alpine.js** - No React/Vue/Svelte
3. **Use DaisyUI components** - No custom UI from scratch
4. **Handle loading/error states** in components
5. **Use `bun run sst-dev`** - Never `bun run dev`

## COMMON MISTAKES

❌ React components → ✅ Alpine.js directives
❌ Custom styling → ✅ Tailwind + DaisyUI
❌ Client-side API calls → ✅ Server-side data fetching
❌ New CSS files → ✅ Tailwind utilities
❌ No TypeScript → ✅ All components use TypeScript

## PATTERNS

**Component Structure:** Server-side data fetching in frontmatter, DaisyUI classes  
**Alpine.js:** `x-data`, `@click`, `x-show`, `x-transition` for interactivity  
**Forms:** POST to `/api/`, Alpine for state, DaisyUI loading spinner  
**DaisyUI:** Use `card`, `btn`, `input`, `loading`, `modal` classes  
**Examples:** See components/building/, components/forms/

## FILES

`components/` (reusable), `layouts/` (page layouts), `pages/` (routes), `types/` (TypeScript)

## ASTRO RULES

**Data:** Frontmatter fetching, not client-side  
**Props:** Define interfaces  
**Slots:** Use named slots  
**Styling:** Minimal scoped styles

## TESTING & MONITORING

**Testing:** Test component rendering, Alpine.js interactions, forms, mock data layer, check tmux test output  
**Monitoring:** Check tmux typecheck/astro-check/test outputs after changes  
**Tools:** Use `mcp__language-server__edit_file` for TypeScript, `mcp__tmux__get_output` for monitoring  
**Examples:** See tests/astro/ (when created)

## TOOL USAGE

**Edit TypeScript/Astro:** `mcp__language-server__edit_file` (immediate validation)  
**Search components:** `Grep` patterns, `Glob` for files  
**Web research:** `mcp__search__brave_search` for Astro/Alpine.js/DaisyUI docs  
**UI testing:** `mcp__browser__*` tools for component interaction testing  
**Avoid:** `Edit`, `WebFetch`, `WebSearch` (use MCP equivalents)