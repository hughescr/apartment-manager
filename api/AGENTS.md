# API Layer Agent Guidelines

## CRITICAL RULES

1. **Return proper HTTP status codes** - 200/201/400/404/500
2. **Validate request bodies** before processing
3. **Use data layer** - No direct DynamoDB access
4. **Handle errors gracefully** - meaningful messages
5. **Don't expose internal errors** - log and return generic

## COMMON MISTAKES

❌ Always 200 → ✅ Use proper status codes
❌ No validation → ✅ Validate all inputs
❌ Expose stack traces → ✅ User-friendly messages
❌ Direct DB access → ✅ Use data layer
❌ Custom CORS → ✅ SST handles CORS

## PATTERNS

**Handler Structure:** Extract/validate input → call data layer → return response → handle errors  
**Validation:** Parse and validate `event.body`, check required fields  
**HTTP Methods:** GET (retrieve), POST (create/201), PUT (update), PATCH (partial), DELETE (remove/204)  
**Examples:** See api/buildings.ts

## FILES

`index.ts` (router), `buildings.ts`/`units.ts`/`unitTypes.ts` (endpoints), `upload.ts` (files)

## TESTING & MONITORING

**Testing:** Mock data layer, test HTTP methods/status codes/validation/errors, check tmux test output  
**Monitoring:** Check tmux typecheck/test outputs after changes  
**Tools:** Use `mcp__language-server__edit_file` for TypeScript, `mcp__tmux__get_output` for monitoring  
**Examples:** See tests/api/*.test.ts

## TOOL USAGE

**Edit TypeScript:** `mcp__language-server__edit_file` (immediate validation)  
**Search code:** `Grep` patterns, `Glob` for files  
**Web research:** `mcp__search__brave_search` for AWS Lambda/API Gateway docs  
**Avoid:** `Edit`, `WebFetch`, `WebSearch` (use MCP equivalents)