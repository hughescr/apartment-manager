# Codex Assistant Guide

Refer to `AGENTS.md` for the shared engineering playbook. This document captures the Codex-specific expectations so the assistant can work alongside Claude without inheriting Claude-only constraints.

## Environment Setup

- Codex reads configuration from `~/.codex/config.toml` (or `${CODEX_HOME}/config.toml`). Add this project’s entries there rather than in the repository.  
- Mirror the Claude MCP setup by adding both the global servers and the project-local servers (`language-server`, `tmux`). Example snippet:

```toml
# ~/.codex/config.toml
[mcp_servers.browser]
command = "bunx"
args = ["--bun", "@playwright/mcp@latest", "--browser", "webkit", "--user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15"]

[mcp_servers.web-fetch]
command = "bunx"
args = ["--bun", "mcp-server-fetch-typescript@latest"]

[mcp_servers.search]
command = "bunx"
args = ["--bun", "mcp-omnisearch@latest"]
env = { BRAVE_API_KEY = "<your key>", PERPLEXITY_API_KEY = "<your key>" }

[mcp_servers.time]
command = "uvx"
args = ["mcp-server-time@latest", "--local-timezone=America/Los_Angeles"]

[mcp_servers.documentation]
command = "bunx"
args = ["--bun", "@upstash/context7-mcp@latest"]

[mcp_servers.calculator]
command = "uvx"
args = ["--from", "calculator-mcp-server@git+https://github.com/hughescr/calculator-mcp-server.git", "--", "calculator-mcp-server", "--stdio"]

[mcp_servers.language-server]
command = "${HOME}/go/bin/mcp-language-server"
args = ["--workspace", ".", "--lsp", "bunx", "--", "--bun", "typescript-language-server@latest", "--stdio"]

[mcp_servers.tmux]
command = "bunx"
args = ["--bun", "@hughescr/tmux-mcp-server@latest"]
```

- Restart Codex after updating the config so it discovers the servers. If you keep separate Codex profiles, place the project-specific entries under the corresponding `[profiles.<name>]` block.

## Workflow Preferences

- Standard CLI usage is allowed. Use familiar commands (`ls`, `rg`, `bun`, `git`, etc.) while respecting the repository's tooling (Bun, SST, Astro).
- Manage watchers as needed. You may run `bun run sst-dev`, `bun run tsc --pretty false --watch`, `bun run astro check --watch`, and `bun test --watch` directly or attach to existing tmux sessions when convenient.
- Run commands thoughtfully—avoid destructive actions unless explicitly requested and keep changes scoped to the user request.

## Editing & Validation

- Edit files directly with your preferred tools; save frequently.
- Codex does not yet support Claude-style post-edit hooks. Approximate the behaviour by keeping an ESLint watcher running (e.g. start `bunx eslint --cache --format=unix --fix --ext .ts,.tsx,.astro --watch "astro-src"` in a tmux pane) or rerun `bun run lint -- <file>` after each save.
- Maintain 4-space indentation and `if(condition)` formatting to match the project's conventions.

## Sub-Agent Support

- Codex does not require delegation, but you may organise work however the session allows. If a sub-agent mechanism becomes available, follow the shared project rules and coordinate responsibilities explicitly.

## Coordination Tips

- Keep Claude-specific automation intact; do not modify `.claude/**` assets.  
- When collaborating with Claude in the same branch, ensure both assistants respect the shared guide and reconcile any conflicting automation before committing.

## Common Pitfalls

- Forgetting to run ESLint (the automatic hook should cover most edits, but double-check warnings).  
- Accidentally adopting Claude-only restrictions (e.g., refusing to use the shell). Stick to the Codex guidelines in this file.  
- Leaving background watchers running after the task—stop temporary processes you start.

## Verification Checklist

- Run `codex mcp list` to confirm the merged MCP servers appear.  
- Start a session, edit a file, and ensure your ESLint watcher or manual lint step catches issues.  
- If tmux watchers are used, verify they are cleaned up after the task.
