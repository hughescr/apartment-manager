# Coding Agents Guide for Apartment Manager

## CRITICAL RULES - MUST FOLLOW

1. **ALWAYS use `bun run sst-dev` to start development** - NEVER use `bun run dev`. Astro requires the SST server to function properly.
2. **NEVER create files unless absolutely necessary** - ALWAYS prefer editing existing files over creating new ones.
3. **NEVER proactively create documentation files** (*.md) or README files unless explicitly requested.
4. **ALWAYS use `bunx` instead of `npx`** and **ALWAYS use `bun` instead of `npm`**.
5. **NEVER disable TypeScript errors** with `@ts-ignore` or `@ts-expect-error` - ALWAYS fix the underlying type issues properly.
6. **ALWAYS use MCP tools for linting and type checking** - NEVER run `eslint` or `tsc` directly.
7. **NEVER run SST commands directly** - ALWAYS use the bun scripts from package.json for AWS credential injection.
8. **ALWAYS write tests before implementing features** - NEVER proceed to the next implementation step without passing tests.
9. **ALWAYS ignore TypeScript errors from the `.sst` directory** - these are SST framework-generated files, not application code.
10. **DO ONLY what has been asked** - nothing more, nothing less.

## TOOL PRIORITIZATION - ALWAYS USE SPECIALIZED TOOLS FIRST

**File Operations:**
❌ `find/grep/cat/ls` → ✅ Glob/Grep/Read/LS tools

**Code Analysis:**
❌ `tsc/eslint` → ✅ mcp__language-server/mcp__eslint tools

**File Editing - Choose wisely:**
- Line-based edits (errors, diagnostics) → `mcp__language-server__edit_file`
- Multiple find-replace → `MultiEdit`
- Single find-replace → `Edit`

**Web/Network:**
❌ `curl/wget` → ✅ WebFetch/mcp__web-fetch tools

**Process Management:**
❌ `tmux` commands → ✅ mcp__tmux tools

**Documentation:**
❌ Web searches → ✅ Context7 MCP for library docs

**When Bash IS appropriate:**
- Git operations (except PRs - use `gh`)
- Package management (`bun install/add`)
- Running npm scripts (`bun run sst-dev`)
- Simple filesystem ops (`mkdir/rm`)

## SUB-AGENT USAGE - MAXIMIZE EFFICIENCY

**Core Principle**: ALWAYS consider using sub-agents for tasks that match their expertise instead of doing everything yourself.

### Standard Development Recipe

Follow this workflow and delegate to appropriate agents at each stage:

**1. Research & Understanding**
- Use agents specialized in research and analysis
- Gather requirements and understand existing patterns
- Let agents explore the codebase for you

**2. Design & Architecture**
- Delegate design tasks to agents with relevant expertise
- Get architectural guidance from specialized agents
- Have agents create data models and system designs

**3. Implementation**
- Use implementation-focused agents for writing code
- Let documentation agents handle documentation tasks
- Follow the designs from step 2

**4. Testing & Validation**
- Delegate test creation to testing specialists
- Use review agents for quality checks
- Have agents validate architectural consistency

**5. Debug & Iterate**
- Use debugging agents for error resolution
- Let troubleshooting agents handle deployment issues
- Loop back to earlier stages as needed

### Key Guidelines

- **Review available agents** and match tasks to agent capabilities
- **Delegate proactively** - don't wait to be asked to use agents
- **Provide detailed instructions** about what you need from each agent
- **Use multiple agents concurrently** when tasks can be parallelized
- **Trust agent expertise** in their specialized domains
- **Move work into agent contexts** to reduce your own context usage
- **Prioritize specialized tools** - All agents must prefer MCP/specialized tools over Bash

### Best Practices

- Always check if an available agent matches your current task
- Give agents comprehensive context and clear success criteria
- Let agents handle the details of their specialized domains
- Focus on orchestration while agents do the specialized work

## COMMON MISTAKES TO AVOID

### Starting Development
❌ `bun run dev` → ✅ `bun run sst-dev`
❌ `bunx sst dev` → ✅ `bun run sst-dev`
❌ `npm install` → ✅ `bun install`
❌ `npx` → ✅ `bunx`

### Code Quality Checks
❌ `eslint src/` → ✅ Use `mcp__eslint__lint-files` tool
❌ `tsc --noEmit` → ✅ Use `mcp__language-server__diagnostics` tool
❌ `bun test` → ✅ `bun test` (same thing, but consistent with npm scripts)
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
- `noEmit` is already configured in tsconfig.json - just run `tsc`
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
  - Example: `mcp__language-server__diagnostics` with `filePath: "/absolute/path/to/file.ts"`

### ESLint Compliance

#### Getting Current ESLint Rules
To see all active ESLint rules for a file:
```bash
bunx eslint --print-config path/to/file.ts
```

#### Understanding ESLint Rules
Use Context7 MCP to get detailed information about specific rules:
- Use `mcp__Context7__get-library-docs` with library ID `/eslint-stylistic/eslint-stylistic`
- Search for specific rules like `keyword-spacing`, `space-before-function-paren`, etc.
- Context7 provides extensive examples showing correct and incorrect usage

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

**NEW APPROACH**: Tests are now decoupled from SST server management for better flexibility.

#### Environment Variables for Testing
- `E2E_BASE_URL` - Base URL for E2E tests (defaults to `http://localhost:4321`)
- `API_BASE_URL` - Base URL for API tests (if needed)
- Additional environment variables can be set as needed

#### Running Tests
```bash
# Run all tests (uses default URLs)
bun test

# Run tests against local SST dev server
E2E_BASE_URL=http://localhost:4321 bun test

# Run tests against deployed environment
E2E_BASE_URL=https://my-app.cloudfront.net bun test

# Run specific test file
bun test tests/data/buildings.test.ts

# Run tests matching a pattern
bun test --testNamePattern="Unit Types"
```

#### Server Management for Testing
You are responsible for starting the appropriate server before running tests:

1. **For local development testing**:
   ```bash
   # Terminal 1: Start SST dev server
   bun run sst-dev
   
   # Terminal 2: Run tests (after server is ready)
   E2E_BASE_URL=http://localhost:4321 bun test
   ```

2. **For testing against deployed environments**:
   ```bash
   # No server to start - just point to the deployed URL
   E2E_BASE_URL=https://staging.myapp.com bun test
   ```

#### Benefits of This Approach
- **Better debugging** - See server logs in real-time while tests run
- **Flexibility** - Easy to test against different environments
- **Simplicity** - No complex shell script wrappers
- **Control** - Choose which server to test against

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

# Run tests (server must be running separately for E2E/UI tests)
bun test

# Complete validation suite (linting, type checking, tests, and Astro check)
bun run full-test

# Check Astro components
bun run astro-check

# SST diagnostics with logs
bun run sst-diagnostics
```

### Starting SST Development Server with MCP tmux

**IMPORTANT**: Use the MCP tmux server to start SST dev server asynchronously:

1. **Create workspace**: Use `mcp__tmux__create_workspace` with `workspace_id: "sst-dev"`
2. **Start SST**: Use `mcp__tmux__run_command` with:
   - `command: "bun run sst-dev"`
   - `workspace_id: "sst-dev"`
   - `window_name: "main"`
3. **Monitor output**: Use `mcp__tmux__get_output` to check server status and get URLs
4. **Send commands**: Use `mcp__tmux__send_keys` for navigation (e.g., `["j"]`, `["k"]`, `["Enter"]`)

**Key Points:**
- SST automatically manages Astro and other services
- Use `mcp__tmux__get_output` to find Astro URL (typically http://localhost:4321/)
- API and Upload URLs are shown in SST console output
- To restart Astro: Send keys `["Enter"]` to focus Web section, `["x"]` to kill, `["Enter"]` to restart
- **NEVER** run Astro separately - SST must manage the process

### SST Server ncurses UI Navigation

When running `bun run sst-dev`, you'll get an interactive ncurses UI. Here's how to navigate:

**Basic Navigation:**
- `j/k` or `↓/↑` - Move up/down in the sidebar
- `Enter` - Focus on selected section (SST, Functions, Web)
- `Ctrl+Z` - Return to sidebar from focused section
- `x` - Kill selected process (from sidebar)
- `Ctrl+C` - Exit the entire SST dev server

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
- If `$AWS_REGION` is not set, scripts will use 1Password for credential injection

### MCP Tools Reference

**Code Quality Tools** (preferred over direct commands):
- `mcp__eslint__lint-files`: Lint TypeScript/JavaScript files
- `mcp__language-server__diagnostics`: Get TypeScript diagnostics

**Language Server Tools**:
- `mcp__language-server__hover`: Get type information and documentation
- `mcp__language-server__definition`: Read source code definitions
- `mcp__language-server__references`: Find all usages of a symbol
- `mcp__language-server__rename_symbol`: Rename symbols across the codebase
- `mcp__language-server__edit_file`: Apply multiple edits to a file

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
- EventBridge for scheduled syncs
- SNS for error notifications

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

## Resources
- [Astro Documentation](https://docs.astro.build/)
- [SST Documentation](https://sst.dev/docs/)
- [Alpine.js Documentation](https://alpinejs.dev/start-here)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs/)
- [DaisyUI Components](https://daisyui.com/components/)
- [Playwright Documentation](https://playwright.dev/docs/intro)