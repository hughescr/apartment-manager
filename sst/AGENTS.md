# SST Infrastructure Agent Guidelines

## CRITICAL RULES

1. **Optimize for AWS free tier** - Check limits first
2. **Use SST v3 patterns** - Not v2 syntax
3. **Bind resources properly** - Use `link` for access
4. **No hardcoded ARNs/IDs** - Use SST references
5. **Least privilege IAM** - Only necessary permissions

## COMMON MISTAKES

❌ Hardcoding names → ✅ `Resource.MyTable.name`
❌ Manual IAM → ✅ SST auto permissions
❌ Multiple stacks → ✅ One stack for free tier
❌ Not linking → ✅ `link: [table]` in functions
❌ CDK constructs → ✅ SST components

## PATTERNS

**Resources:** Use `new sst.aws.Dynamo()` with on-demand billing  
**Functions:** Use `link: [table]` for auto permissions  
**API:** `new sst.aws.ApiGatewayV2()` with `cors: true`  
**Examples:** See sst/dynamo.ts, sst/api.ts

## FREE TIER LIMITS

**DynamoDB:** On-demand, 25GB storage, 25 read/write units  
**Lambda:** 1M requests/month, 400K GB-seconds  
**S3:** 5GB storage, 20K GET, 2K PUT  
**CloudFront:** 1TB transfer, 10M requests

## FILES

`api.ts` (API/Lambda), `astro.ts` (site), `dynamo.ts` (tables), `s3.ts` (buckets), `sst.config.ts` (main)

## TESTING & MONITORING

**Testing:** Use `bun run sst-diagnostics` for validation, test permissions/limits/linking, check tmux test output  
**Monitoring:** Check tmux typecheck/test outputs after changes  
**Tools:** Use `mcp__language-server__edit_file` for TypeScript, `mcp__tmux__get_output` for monitoring  
**SST Validation:** `bun run sst-diagnostics` is allowed for SST-specific checks

## TOOL USAGE

**Edit TypeScript:** `mcp__language-server__edit_file` (immediate validation)  
**Search infrastructure:** `Grep` patterns, `Glob` for files  
**Web research:** `mcp__search__brave_search` for SST/AWS docs  
**Avoid:** `Edit`, `WebFetch`, `WebSearch` (use MCP equivalents)