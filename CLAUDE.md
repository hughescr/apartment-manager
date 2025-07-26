# Overall Process
Follow the detailed instructions in AGENTS.md

# TypeScript Tips
- When you want to run `tsc --noEmit`, just run `tsc` because `noEmit` is in the tsconfig
- TypeScript errors from the `.sst` directory can be safely ignored - these are SST framework-generated files, not application code
  - Example: Errors in `.sst/platform/src/components/base/base-ssr-site.ts` are SST's responsibility, not ours
  - Focus on fixing errors in the application code only