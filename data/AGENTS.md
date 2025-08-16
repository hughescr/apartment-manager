# Data Layer Agent Guidelines

## CRITICAL RULES

1. **Use dynamodb-toolbox entities** - No raw DynamoDB calls
2. **Return typed data** - No `any` type
3. **Handle DynamoDB errors** - NotFound, throttling
4. **Use AWS Secrets Manager** - No unencrypted sensitive data
5. **Validate input data** - Before operations

## COMMON MISTAKES

❌ Raw DynamoDB → ✅ `entity.get()`, `entity.put()`
❌ Not handling undefined → ✅ Check before operations
❌ Assuming items exist → ✅ Handle NotFound gracefully
❌ Ignoring limits → ✅ Batch max 25 items
❌ Hardcoding names → ✅ Use SST Resource bindings

## PATTERNS

**Entity Operations:** Use `BuildingEntity.get({ buildingID })` not raw DynamoDB
**Error Handling:** Check for `ResourceNotFoundException`, handle gracefully
**Batch Operations:** Max 25 items per batch, see `data/units.ts`

## FILES

`model.ts` (entities), `db.ts` (client), `buildings.ts`/`units.ts`/`unitTypes.ts` (CRUD), `index.ts` (exports)

## TESTING & MONITORING

**Testing:** Mock dynamodb-toolbox, test error scenarios, check tmux test output  
**Monitoring:** Check tmux typecheck/test outputs after changes  
**Tools:** Use `mcp__language-server__edit_file` for TypeScript, `mcp__tmux__get_output` for monitoring  
**Examples:** See tests/data/*.test.ts

## TOOL USAGE

**Edit TypeScript:** `mcp__language-server__edit_file` (immediate validation)  
**Search code:** `Grep` patterns, `Glob` for files  
**Web research:** `mcp__search__brave_search` for DynamoDB docs  
**Avoid:** `Edit`, `WebFetch`, `WebSearch` (use MCP equivalents)