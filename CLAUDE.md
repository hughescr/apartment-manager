# Claude Code Assistant Guide

## Tooling Expectations

- **Tools before terminal:** prefer Claude's MCP tools (e.g., `Glob`, `Grep`, `Read`, `LS`) before falling back to shell commands.
- **Editing:** use `mcp__language-server__edit_file` for TypeScript and `MultiEdit` for other file types to benefit from live diagnostics.
- **Bun-first workflow:** invoke project scripts via `bun`/`bunx`; avoid `npm`/`npx`.
- **Watchers via MCP:** manage development watchers with the tmux MCP server (`mcp__tmux__list_workspaces`, `mcp__tmux__run_command`, `mcp__tmux__get_output`). Do not run `tsc`, `astro check`, or `bun test` directly.
- **Lint enforcement:** the Claude settings run ESLint automatically after each edit—review output and fix issues immediately.

## Sub-Agent Orchestration

- Treat Claude Code as a conductor. Delegate implementation work to the appropriate sub-agent (see `~/.claude/agents/*.md`).
- Handle only coordination, planning, and communication in the primary session; sub-agents perform analysis, coding, and execution.
- When delegating, remind sub-agents to follow the module guides and monitor tmux watchers.

## Watcher Windows

- Long-lived tmux windows: `sst-dev`, `tsc-watch`, `astro-watch`, `test-watch`. Do not close them once started.
- Check for existing windows before launching new watchers.
- Temporary windows you create must be cleaned up (Ctrl+C, exit shell).

## Common Pitfalls

- Forgetting to route work through sub-agents.
- Falling back to raw shell commands when an MCP tool exists.
- Ignoring ESLint diagnostics emitted by the post-edit hook.
- Running tests or checkers outside the watcher workflow.

# Shared engineering playbook

@AGENTS.md
