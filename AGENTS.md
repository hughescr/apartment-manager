# Coding Agents Guide for Apartment Manager

## 🛑 STOP AND READ: TOOL USAGE IS MANDATORY 🛑

### ⚠️ CRITICAL: Tools Before Terminal - ALWAYS ⚠️

**BEFORE ANY ACTION, ASK YOURSELF: "Is there a specialized tool for this?"**
**If YES → Use the tool. If NO → Double-check, there probably is one.**

## CRITICAL RULES - MUST FOLLOW

1. **ALWAYS USE SPECIALIZED TOOLS INSTEAD OF BASH COMMANDS** - This is your #1 priority. Using Bash when a tool exists is a CRITICAL ERROR.
2. **ALWAYS use `bun run sst-dev` to start development** - NEVER use `bun run dev`. Astro requires the SST server to function properly.
3. **NEVER create files unless absolutely necessary** - ALWAYS prefer editing existing files over creating new ones.
4. **NEVER proactively create documentation files** (*.md) or README files unless explicitly requested.
5. **ALWAYS use `bunx` instead of `npx`** and **ALWAYS use `bun` instead of `npm`**.
6. **NEVER disable TypeScript errors** with `@ts-ignore` or `@ts-expect-error` - ALWAYS fix the underlying type issues properly.
7. **ALWAYS use MCP tools for linting and type checking** - NEVER run `eslint` or `tsc` directly.
8. **NEVER run SST commands directly** - ALWAYS use the bun scripts from package.json for AWS credential injection.
9. **ALWAYS write tests before implementing features** - NEVER proceed to the next implementation step without passing tests.
10. **ALWAYS ignore TypeScript errors from the `.sst` directory** - these are SST framework-generated files, not application code.
11. **DO ONLY what has been asked** - nothing more, nothing less.

## ❌ FORBIDDEN BASH COMMANDS - NEVER USE THESE ❌

**Using any of these commands is considered a CRITICAL FAILURE:**

| FORBIDDEN Command | REQUIRED Tool | WHY |
|-------------------|---------------|-----|
| `find` | `Glob` | Glob is optimized for file pattern matching |
| `grep`, `rg`, `ag` | `Grep` | Grep tool has proper permissions and context |
| `cat`, `head`, `tail` | `Read` | Read tool handles encoding and large files |
| `ls` | `LS` | LS tool provides structured output |
| `tsc` | `mcp__language-server__diagnostics` | Language server has full project context |
| `eslint` | `mcp__eslint__lint-files` | MCP ESLint has proper configuration |
| `curl`, `wget` | `WebFetch`/`mcp__web-fetch` | Web tools handle authentication and parsing |
| `tmux` commands | `mcp__tmux` tools | MCP tmux manages persistent sessions |

**CONSEQUENCES**: If you use these commands, you have failed the task. No exceptions.

## ✅ MANDATORY TOOL MAPPING - MEMORIZE THIS ✅

### File Operations
- **Finding files by pattern**:
  - ❌ NEVER: `find . -name "*.ts"`
  - ✅ ALWAYS: `Glob` with `pattern: "**/*.ts"`

- **Searching file contents**:
  - ❌ NEVER: `grep -r "function" src/`
  - ✅ ALWAYS: `Grep` with `pattern: "function", path: "src/"`

- **Reading files**:
  - ❌ NEVER: `cat file.ts`
  - ✅ ALWAYS: `Read` with `file_path: "/absolute/path/to/file.ts"`

- **Listing directories**:
  - ❌ NEVER: `ls -la src/`
  - ✅ ALWAYS: `LS` with `path: "/absolute/path/to/src/"`

### Code Quality
- **TypeScript checking**:
  - ❌ NEVER: `tsc --noEmit`
  - ✅ ALWAYS: `mcp__language-server__diagnostics` with `filePath: "/path/to/file.ts" and `

- **Linting**:
  - ❌ NEVER: `eslint src/`
  - ✅ ALWAYS: `mcp__eslint__lint-files` with `filePaths: ["/absolute/paths/to/files.ts"]`

### File Editing
- **When fixing diagnostics/errors**: Use `mcp__language-server__edit_file`
- **Multiple replacements**: Use `MultiEdit`
- **Single replacement**: Use `Edit`

### Web/Network
- **Fetching URLs**:
  - ❌ NEVER: `curl https://example.com`
  - ✅ ALWAYS: `WebFetch` or `mcp__web-fetch` tools

### Process Management
- **Terminal sessions**:
  - ❌ NEVER: Direct `tmux` commands
  - ✅ ALWAYS: `mcp__tmux` tools for persistent sessions

## 📋 PRE-FLIGHT CHECKLIST - USE BEFORE EVERY ACTION

Before executing ANY command or action, go through this checklist:

1. ✓ **Am I about to use a Bash command?** → STOP! Check the tool mapping above.
2. ✓ **Is this a file operation?** → Use Glob/Grep/Read/LS tools.
3. ✓ **Is this code analysis?** → Use language-server/eslint MCP tools.
4. ✓ **Is this web/network related?** → Use WebFetch/mcp__web-fetch tools.
5. ✓ **Have I double-checked the FORBIDDEN COMMANDS list?** → Never use those.

**Remember: "Tools Before Terminal - ALWAYS!"**

## SUB-AGENT USAGE - MAXIMIZE EFFICIENCY

**Core Principle**: ALWAYS consider using sub-agents for tasks that match their expertise instead of doing everything yourself.

### ⚠️ CRITICAL FOR ALL SUB-AGENTS ⚠️

**EVERY sub-agent MUST follow the tool prioritization rules above. No exceptions.**
- Sub-agents using forbidden Bash commands = TASK FAILURE
- Sub-agents MUST check the pre-flight checklist before actions
- When instructing sub-agents, REMIND them: "Use specialized tools, NOT Bash commands"

### Standard Development Recipe

Follow this workflow and delegate to appropriate agents at each stage:

**1. Research & Understanding**
- Use agents specialized in research and analysis
- Gather requirements and understand existing patterns
- Let agents explore the codebase for you
- **REMIND agents**: Use Grep/Glob tools, not bash find/grep

**2. Design & Architecture**
- Delegate design tasks to agents with relevant expertise
- Get architectural guidance from specialized agents
- Have agents create data models and system designs
- **REMIND agents**: Use Read tool for files, not cat

**3. Implementation**
- Use implementation-focused agents for writing code
- Let documentation agents handle documentation tasks
- Follow the designs from step 2
- **REMIND agents**: Use language-server for diagnostics, not tsc

**4. Testing & Validation**
- Delegate test creation to testing specialists
- Use review agents for quality checks
- Have agents validate architectural consistency
- **REMIND agents**: Use mcp__eslint for linting, not eslint CLI

**5. Debug & Iterate**
- Use debugging agents for error resolution
- Let troubleshooting agents handle deployment issues
- Loop back to earlier stages as needed
- **REMIND agents**: Use mcp__tmux for sessions, not direct tmux

### Key Guidelines

- **Review available agents** and match tasks to agent capabilities
- **Delegate proactively** - don't wait to be asked to use agents
- **Provide detailed instructions** about what you need from each agent
- **Use multiple agents concurrently** when tasks can be parallelized
- **Trust agent expertise** in their specialized domains
- **Move work into agent contexts** to reduce your own context usage
- **ENFORCE tool usage** - Remind all agents about the FORBIDDEN COMMANDS list
- **Include tool instructions** - When delegating, specify which tools to use

### Best Practices

- Always check if an available agent matches your current task
- Give agents comprehensive context and clear success criteria
- Let agents handle the details of their specialized domains
- Focus on orchestration while agents do the specialized work
- **ALWAYS remind agents**: "Tools Before Terminal - No Bash commands for operations that have tools!"

## COMMON MISTAKES TO AVOID

### Starting Development
❌ `bun run dev` → ✅ `bun run sst-dev`
❌ `bunx sst dev` → ✅ `bun run sst-dev`
❌ `npm install` → ✅ `bun install`
❌ `npx` → ✅ `bunx`

### Code Quality Checks
❌ `eslint src/` → ✅ Use `mcp__eslint__lint-files` tool
❌ `tsc --noEmit` → ✅ Use `mcp__language-server__diagnostics` tool
❌ Any direct CLI tool → ✅ Check for MCP/specialized tool first

### TypeScript Issues
❌ Adding `@ts-ignore` → ✅ Fix the type issue properly
❌ Fixing errors in `.sst/` directory → ✅ Ignore - these are SST's responsibility
❌ Running `tsc --noEmit` → ✅ Just run `tsc` (noEmit is in tsconfig)

### File Management
❌ Creating new files proactively → ✅ Edit existing files when possible
❌ Creating documentation without being asked → ✅ Only create docs when explicitly requested
❌ Creating README files → ✅ Don't create unless specifically asked

## Project Overview

This project extends an existing apartment management web application to support syncing listings to third-party rental sites (Apartments.com and Zillow Rental Manager).

### Core Technologies
- **Frontend**: Astro with Alpine.js for interactivity
- **Infrastructure**: SST (Serverless Stack) for AWS deployment
- **Database**: DynamoDB for structured data, S3 for media storage
- **Styling**: Tailwind CSS with DaisyUI components
- **Runtime**: TypeScript with Bun runtime
- **Automation**: Playwright for browser automation

## Architecture Overview

### Three-Layer Architecture

1. **Data Layer** (`data/`)
   - Handles all database interactions
   - Provides CRUD operations for buildings, units, and unit types
   - Shared between frontend and API

2. **API Layer** (`api/`)
   - HTTP endpoints for client-side operations
   - Uses data layer for database access
   - New endpoints for credentials and sync management

3. **Frontend** (`astro-src/`)
   - Server-side rendering with Astro
   - Client-side interactivity with Alpine.js
   - UI components from DaisyUI

### Additional Components

4. **Automation Layer** (`src/automation/`)
   - Playwright-based browser automation
   - Site-specific modules for Apartments.com and Zillow

5. **Mapping Layer** (`src/mappers/`)
   - Transforms unified data model to site-specific formats
   - Handles inheritance (model → unit) and defaults

## Development Guidelines

### TypeScript Configuration
- TypeScript with strict type checking
- `noEmit` is already configured in tsconfig.json
- **IGNORE** TypeScript errors from `.sst` directory - these are SST framework files
- **FOCUS** only on fixing errors in application code
- Example: Errors in `.sst/platform/src/components/base/base-ssr-site.ts` are SST's responsibility

### Code Style
- ES modules with `"type": "module"` in `package.json`
- Follow existing code patterns and ESLint rules
- ESLint configuration from `@hughescr/eslint-config-default`
- Fix type issues properly - never use `@ts-ignore` or `@ts-expect-error`
- **Check active ESLint rules dynamically** - see ESLint Compliance section below
- **DO NOT maintain static rule documentation** - rules change with configuration updates

### Using MCP Tools for Code Quality
**ALWAYS use these MCP tools instead of running commands directly:**

- **ESLint**: `mcp__eslint__lint-files` with absolute file paths
  - Example: `mcp__eslint__lint-files` with `filePaths: ["/absolute/path/to/file.ts"]`
- **TypeScript**: `mcp__language-server__diagnostics` for type checking
     Critical Instructions:
     - Use mcp__language-server__diagnostics with contextLines: true to get full diagnostic information
     - Use mcp__language-server__hover to inspect type information at specific locations
     - Use mcp__language-server__definition to examine the function signatures
     - NEVER use tsc directly - always use MCP language server tools
     - Use mcp__language-server__edit_file for making the fixes
     - NEVER use Edit/MultiEdit for fixing language server diagnostics

### ESLint Compliance

#### Getting Current ESLint Rules
To see all active ESLint rules for a file:
```bash
bunx eslint --print-config path/to/file.ts
```

#### Understanding ESLint Rules
Use documentation MCP to get detailed information about specific rules:
- Use `mcp__documentation__get-library-docs` with library ID `/eslint-stylistic/eslint-stylistic`
- Search for specific rules like `keyword-spacing`, `space-before-function-paren`, etc.
- documentation MCP provides extensive examples showing correct and incorrect usage

#### Critical Formatting Rules
Pay special attention to these commonly violated rules:
- **`keyword-spacing`**: NO space after `if`/`for`/`while`/`catch`/`switch`
  - ✅ `if(condition)` NOT ❌ `if (condition)`
- **`space-before-function-paren`**: NO space before function parentheses
  - ✅ `function foo()` NOT ❌ `function foo ()`
- **`indent`**: 4 spaces, NOT 2 spaces
- **`comma-dangle`**: Only on multiline, NEVER for functions

### Testing Requirements
- **Test-driven development is MANDATORY**
- Write tests BEFORE implementing features
- Unit tests for all data layer functions
- Integration tests for API endpoints
- UI tests for Astro components
- Mock browser tests for automation modules
- **NEVER proceed without passing tests**

### Running Tests

**SIMPLIFIED APPROACH**: Tests are now completely self-contained with full AWS service mocking.

#### No Server Required
Tests no longer require SST server or AWS credentials. All AWS services (DynamoDB, S3, Lambda, etc.) are properly mocked.

#### Running Tests
```bash
# Run all tests
bun test

# Run specific test file
bun test tests/data/buildings.test.ts

# Run tests matching a pattern
bun test --testNamePattern="Unit Types"

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## Running the Project

### CRITICAL Development Commands

**ALWAYS use bun scripts from package.json:**

```bash
# Install dependencies
bun install

# CRITICAL: Start development server - Astro REQUIRES SST server
bun run sst-dev  # NEVER use 'bun run dev'

# Interactive AWS debugging console
bun run dev-console

# Run tests (fully mocked, no server required)
bun test

# Complete validation suite (linting, type checking, tests, and Astro check)
bun run full-test

# Check Astro components
astro check

# SST diagnostics with logs
bun run sst-diagnostics
```

### Starting SST Development Server with MCP tmux

**IMPORTANT**: Use the MCP tmux server to start SST dev server asynchronously:

1. **Create a window**: Use `mcp__tmux__create_workspace` with `workspace_id: "sst-dev"`
2. **Start SST**: Use `mcp__tmux__run_command` with:
   - `command: "bun run sst-dev"`
   - `workspace_id: "sst-dev"`
   - `window_name: "main"`
3. **Monitor output**: Use `mcp__tmux__get_output` to check server status and get URLs
4. **Send commands**: Use `mcp__tmux__send_keys` for navigation (e.g., `["j"]`, `["k"]`, `["Enter"]`)

**Key Points:**
- SST automatically manages Astro and other services
- Use `mcp__tmux__get_output` to find Astro URL from the "Web" section in the sidebar (typically http://localhost:4321/)
- API and Upload URLs are shown in SST console output
- To restart Astro: Send keys `["Enter"]` to focus Web section, `["x"]` to kill, `["Enter"]` to restart
- **NEVER** run Astro separately - SST must manage the process

### SST Server ncurses UI Navigation

When running `bun run sst-dev`, you'll get an interactive ncurses UI. Here's how to navigate:

**Basic Navigation:**
- `j/k` or `"Up"/"Down"` - Move up/down in the sidebar
- `Enter` - Focus on selected section (SST, Functions, Web)
- `C-z` - Return to sidebar from focused section
- `x` - Kill selected process (from sidebar)
- `C-c` - Exit the entire SST dev server

**UI Sections:**
- **SST** - Shows infrastructure deployment status and errors
- **Functions** - Lists Lambda functions and their status
- **Web** - Shows Astro dev server output

**Debugging Tips:**
- Check Functions section for Lambda errors
- SST section shows IAM policy and deployment errors
- Web section displays Astro build/runtime logs

### AWS Secrets Management

**CRITICAL**: All AWS-related commands MUST use bun scripts from package.json.

- Scripts automatically inject AWS credentials via `op run` from 1Password
- Never run `sst` commands directly
- If `$AWS_ACCESS_KEY_ID` is not set, scripts will use 1Password for credential injection

## Implementation Plan

For the detailed step-by-step implementation plan, including architecture details and task checklists, see **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)**.

## Security Guidelines
- Never commit credentials to the repository
- Use AWS Secrets Manager for all sensitive data
- Encrypt credentials at rest in DynamoDB
- Validate all user inputs
- Secure API endpoints with proper authentication

## AWS Services Used
- Lambda functions for API endpoints and sync operations
- CloudFront for content delivery
- DynamoDB for data persistence
- Secrets Manager for credential storage

The application is designed to stay within AWS free tier limits for managing a small number of buildings and units.

## When to Use Each Layer
- **Data Layer**: Database operations from frontend or API
- **API**: Client-side actions without page reload
- **Frontend**: UI rendering and server-side data fetching
- **Automation**: Browser-based sync operations
- **Mapping**: Data transformation between systems

## Legal Compliance
- Respect Terms of Service for third-party sites
- Document any potential compliance risks
- Consider using official APIs if available
- Provide clear disclaimers to users

## Module-Specific Guidelines

For detailed module-specific patterns and rules, see:
- `/data/AGENTS.md` - Data layer patterns and DynamoDB best practices
- `/api/AGENTS.md` - API endpoint patterns and Lambda guidelines
- `/astro-src/AGENTS.md` - Frontend component patterns and Alpine.js usage
- `/sst/AGENTS.md` - Infrastructure configuration and free tier optimization
- `/tests/AGENTS.md` - Testing requirements and mocking patterns

**ALWAYS check module-specific AGENTS.md when working in those directories.**

## 🔧 RARE EXCEPTIONS: When Bash IS Appropriate 🔧

**⚠️ IMPORTANT: CHECK TOOLS FIRST! These are the ONLY acceptable Bash uses:**

1. **Git operations** (except PRs - use `gh` for those)
   - `git add`, `git commit`, `git push`, etc.

2. **Package management**
   - `bun install`, `bun add <package>`
   - BUT remember: use `bunx` not `npx`, use `bun` not `npm`

3. **Running bun scripts and tests**
   - `bun run sst-dev` for development server
   - `bun test` for running tests
   - Other scripts defined in package.json use `bun run`

4. **Simple filesystem operations**
   - `mkdir` for creating directories
   - `rm` for removing files/directories
   - BUT: For finding/reading files, use tools!

**Before using Bash for ANY reason:**
1. Double-check the FORBIDDEN COMMANDS list
2. Verify there's no specialized tool available
3. Remember: "Tools Before Terminal - ALWAYS!"

## Resources
**⚠️ IMPORTANT: CHECK mcp__documentation FIRST FOR DOCUMENTATION**
- [Astro Documentation](https://docs.astro.build/)
- [SST Documentation](https://sst.dev/docs/)
- [Alpine.js Documentation](https://alpinejs.dev/start-here)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs/)
- [DaisyUI Components](https://daisyui.com/components/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
