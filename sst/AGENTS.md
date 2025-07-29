# SST Infrastructure Agent Guidelines

## CRITICAL RULES FOR THIS MODULE

1. **ALWAYS optimize for AWS free tier** - Check limits before adding resources
2. **ALWAYS use SST v3 patterns** - NOT v2 syntax
3. **ALWAYS bind resources properly** - Use `link` for resource access
4. **NEVER hardcode ARNs or IDs** - Use SST resource references
5. **ALWAYS use least privilege IAM** - Only grant necessary permissions

## COMMON MISTAKES IN SST CONFIG

❌ Hardcoding table names → ✅ Use `Resource.MyTable.name`
❌ Manual IAM policies → ✅ Use SST's automatic permissions
❌ Creating multiple stacks → ✅ Keep everything in one stack for free tier
❌ Not linking resources → ✅ Use `link: [table]` in function config
❌ Using CDK constructs → ✅ Use SST components

## PATTERNS TO FOLLOW

### Resource Definition
```typescript
// See sst/dynamo.ts for patterns
export const buildingsTable = new sst.aws.Dynamo("Buildings", {
  fields: {
    buildingID: "string",
  },
  primaryIndex: { hashKey: "buildingID" },
  // No provisioned capacity - use on-demand for free tier
});
```

### Function Configuration
```typescript
// See sst/api.ts for patterns
new sst.aws.Function("GetBuildings", {
  handler: "api/buildings.handler",
  link: [buildingsTable], // Automatic permissions
  environment: {
    // SST handles table name injection
  }
});
```

### API Gateway
```typescript
// See sst/api.ts
export const api = new sst.aws.ApiGatewayV2("Api", {
  cors: true, // SST handles CORS properly
});

api.route("GET /buildings", "api/buildings.list");
api.route("POST /buildings", "api/buildings.create");
```

## FREE TIER OPTIMIZATION

### DynamoDB
- Use on-demand billing (not provisioned)
- 25GB storage free
- 25 read/write units free

### Lambda
- 1M requests/month free
- 400,000 GB-seconds free
- Keep functions small

### S3
- 5GB storage free
- 20,000 GET requests
- 2,000 PUT requests

### CloudFront
- 1TB transfer out free
- 10M requests free

## FILE STRUCTURE

- `api.ts` - API Gateway and Lambda functions
- `astro.ts` - Astro site configuration
- `dynamo.ts` - DynamoDB tables
- `s3.ts` - S3 buckets
- Root `sst.config.ts` - Main configuration

## TESTING REQUIREMENTS

- Run `bun run sst-diagnostics` to validate config
- Test resource permissions are correct
- Verify free tier limits aren't exceeded
- Check all resources are properly linked
- Unit tests for SST config don't need running infrastructure
- Run tests with `bun test`