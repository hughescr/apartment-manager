# Coding Agents Guide for Apartment Manager

## 🛑 CRITICAL: Tools Before Terminal - ALWAYS 🛑

**BEFORE ANY ACTION**: Check for specialized tools first!

## CRITICAL RULES

1. **TOOLS BEFORE TERMINAL** - Use specialized tools, not bash commands
2. **Use `bun run sst-dev`** - NEVER `bun run dev`
3. **Edit existing files** - Don't create new ones unless required
4. **Use `bunx`/`bun`** - Not `npx`/`npm`
5. **Fix TypeScript errors** - No `@ts-ignore`
6. **Use MCP tools** - Not direct `eslint`/`tsc` commands
7. **Test-driven development** - Tests before features
8. **Never use `mock.module()`** - Causes permanent test pollution
9. **Use test-setup.ts patterns** - See existing examples
10. **Ignore `.sst/` errors** - SST framework responsibility
11. **Do only what's asked** - Nothing more/less

## ❌ FORBIDDEN COMMANDS → ✅ REQUIRED TOOLS

| Forbidden | Use Instead |
|-----------|-------------|
| `find` | `Glob` |
| `grep`/`rg` | `Grep` |
| `cat`/`head`/`tail` | `Read` |
| `ls` | `LS` |
| `tsc` | `mcp__language-server__diagnostics` |
| `eslint` | `mcp__eslint__lint-files` |
| `curl`/`wget` | `mcp__web-fetch` |
| `tmux` | `mcp__tmux` tools |
| `mock.module()` | test-setup.ts patterns |

## ✅ TOOL HIERARCHY & MAPPING

### **PRIMARY TOOLS (Use First)**
**Files**: `Glob` (find), `Grep` (search), `Read` (view), `LS` (list)  
**Code**: `mcp__language-server__diagnostics` (TypeScript), `mcp__eslint__lint-files` (lint)  
**Edit**: `mcp__language-server__edit_file` (TypeScript files - immediate validation)  
**Web**: `mcp__web-fetch__get_markdown_summary` (articles), `mcp__web-fetch__get_rendered_html` (SPAs)  
**Search**: `mcp__search__brave_search` (general), `mcp__search__perplexity_search` (complex analysis)  
**Browser**: `mcp__browser__*` tools (automation)  
**Sessions**: `mcp__tmux` tools

### **FALLBACK TOOLS (When Primary Unavailable)**
**Edit**: `MultiEdit` (non-TypeScript files or multiple changes)  
**Web**: `mcp__web-fetch__get_raw_text` (JSON/XML/CSV), `mcp__web-fetch__get_markdown` (general)

### **DEPRECATED/AVOID**
❌ `Edit` (use `MultiEdit` instead)  
❌ `WebFetch` (use `mcp__web-fetch` instead)  
❌ `WebSearch` (use `mcp__search__brave_search` instead)

## 📋 CHECKLIST

1. Bash command? → Check tool mapping  
2. File operation? → Use file tools  
3. Code analysis? → Use MCP tools  
4. Web/network? → Use `mcp__web-fetch` tools  
5. Search needed? → Use `mcp__search__brave_search`  
6. Check forbidden commands list

## 📺 CONTINUOUS MONITORING

### **Standardized Long-lived Watcher Windows**

**ALWAYS check first with `mcp__tmux__list_workspaces` before starting any watcher process!**

**Standard window names:**
- `sst-dev` - SST development server (`bun run sst-dev`)
- `tsc-watch` - TypeScript watcher (`bun run tsc --pretty false --watch`)
- `astro-watch` - Astro checker (`bun run astro check --watch`)
- `test-watch` - Test watcher (`bun test --watch`)

**Setup process for agents:**
1. Use `mcp__tmux__list_workspaces` to check existing windows
2. If window doesn't exist, start with `mcp__tmux__run_command`
3. If window exists, proceed to monitoring with `mcp__tmux__get_output`

**Example check:**
```
// Check if tsc-watch exists
list_workspaces() → if "tsc-watch" not found:
  run_command("bun run tsc --pretty false --watch", "tsc-watch")
// Always monitor existing window
get_output({window_name: "tsc-watch"})
```

**Monitor tmux output after changes:**
- `mcp__tmux__get_output({ window_name: "sst-dev" })`
- `mcp__tmux__get_output({ window_name: "tsc-watch" })`
- `mcp__tmux__get_output({ window_name: "astro-watch" })`
- `mcp__tmux__get_output({ window_name: "test-watch" })`

**Don't run `tsc`/`astro check`/`bun test` directly.**

### **Tmux Window Cleanup Rules**

**Long-lived watcher windows** (`sst-dev`, `tsc-watch`, `astro-watch`, `test-watch`):
- ✅ Agents may start these if not running
- ❌ Agents must NOT kill/close these
- 🔄 These persist across agent sessions for reuse

**Temporary agent windows** (any other tmux windows agents create):
- 🧹 Agent creating the window is responsible for cleanup
- 🛑 Must kill process (`mcp__tmux__send_keys(["C-c"])`) when done
- 🚪 Must exit shell to allow window to close
- ❌ Don't leave orphaned tmux windows

## SUB-AGENT USAGE

**ALWAYS delegate ALL work to sub-agents.**

### 🎯 CRITICAL: User Requests = Team Delegation

**When users say "you" they mean "you and your team of sub-agents."**

Always interpret user requests as delegation opportunities:

**Examples:**
- User: "Start the background processes" → Delegate to `devops-troubleshooter` or `general-purpose` to start tmux processes
- User: "Fix this bug" → Delegate to `specialist-debugger` or appropriate specialist
- User: "Add a new feature" → Delegate to relevant specialists (`codemonkey-ui-frontend`, `architect-backend`, etc.)
- User: "Explain this code" → Delegate to `general-purpose` to analyze and explain
- User: "Run tests" → Delegate to `specialist-automated-testing`

**Only handle directly:** Pure conversation, coordination between sub-agents, simple task breakdown

**Always delegate:** Any planning requiring research, detailed analysis, codebase exploration, or technical investigation

**Sub-agent requirements:**
- Follow tool prioritization rules
- Check tmux monitoring outputs
- Use specialized tools, not bash commands

### Primary Agent Workflow

**ORCHESTRATE, don't implement:**
1. Evaluate → choose best sub-agent
2. Set up monitoring → tmux processes
3. Delegate → complete context to sub-agents
4. Monitor → check tmux outputs
5. Coordinate → handle handoffs

**Instructions to sub-agents:**
- "Check tmux monitoring outputs"
- "Use tools, not bash commands"
- "Follow module AGENTS.md guidelines"

## COMMON MISTAKES

**Delegation:** Primary agent implementing instead of delegating to sub-agents  
**Commands:** Use `bun run sst-dev` (not `bun run dev`), `bun`/`bunx` (not `npm`/`npx`)  
**Quality:** Check tmux outputs (not direct `tsc`/`eslint`/`bun test`)  
**TypeScript:** Fix errors properly (no `@ts-ignore`), ignore `.sst/` errors  
**Files:** Edit existing files, don't create new ones unless required

## Project Overview

**Tech Stack:** Astro + Alpine.js, SST/AWS, DynamoDB/S3, TypeScript/Bun  
**Architecture:** Data (`data/`) → API (`api/`) → Frontend (`astro-src/`)  
**Additional:** Automation (`src/automation/`), Mapping (`src/mappers/`)

## Development Guidelines

**TypeScript:** Strict checking, ignore `.sst/` errors, fix issues properly  
**ESLint:** Use `mcp__eslint__lint-files`, check rules with `bunx eslint --print-config`  
**Testing:** TDD mandatory, tests before features, check tmux test output  
**Critical rules:** `if(condition)` not `if (condition)`, 4 spaces not 2

## Running the Project

**Key commands:**
- `bun install` - Install dependencies
- `bun run sst-dev` - Start development (NEVER `bun run dev`)
- `bun run full-test` - Complete validation
- `bun run sst-diagnostics` - SST diagnostics

**SST Development:**
1. Use `mcp__tmux__run_command` to start `bun run sst-dev`
2. Use `mcp__tmux__get_output` to monitor status
3. Navigate with `j/k`, `Enter`, `x` (kill), `C-c` (exit)
4. Astro URL typically at http://localhost:4321/

**AWS:** Scripts auto-inject credentials via 1Password

## Implementation Plan

See **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** for details.

## Security
- Never commit credentials
- Use AWS Secrets Manager
- Validate inputs

## AWS Services
Lambda, CloudFront, DynamoDB, Secrets Manager (free tier optimized)

## Module Guidelines

Check module-specific AGENTS.md in: `/data/`, `/api/`, `/astro-src/`, `/sst/`

## Bash Exceptions

**Only acceptable uses:**
- Git operations (`git add`, `git commit`, etc.)
- Package management (`bun install`, `bun add`)
- Bun scripts (`bun run sst-dev`, `bun test`)
- Simple filesystem (`mkdir`, `rm`)

## Tool Selection Quick Reference

**Editing TypeScript?** → `mcp__language-server__edit_file` (immediate validation)  
**Multiple file edits?** → `MultiEdit`  
**Need web content?** → `mcp__web-fetch__get_markdown_summary` (clean content)  
**Research needed?** → `mcp__search__brave_search` (privacy-focused)  
**Complex analysis?** → `mcp__search__perplexity_search` (AI synthesis)  
**Browser automation?** → `mcp__browser__browser_snapshot` then interaction tools

## Resources

Use `mcp__documentation` for: Astro, SST, Alpine.js, Tailwind, DaisyUI, Playwright
