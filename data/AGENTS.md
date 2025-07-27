# Data Layer Agent Guidelines

## CRITICAL RULES FOR THIS MODULE

1. **ALWAYS use dynamodb-toolbox entities** - NEVER make raw DynamoDB calls
2. **ALWAYS return typed data** - NEVER use `any` type
3. **ALWAYS handle DynamoDB errors properly** - especially NotFound and throttling
4. **NEVER store unencrypted sensitive data** - use AWS Secrets Manager for credentials
5. **ALWAYS validate input data** before database operations

## COMMON MISTAKES IN DATA LAYER

❌ Using raw DynamoDB client → ✅ Use `entity.get()`, `entity.put()`, etc.
❌ Not handling undefined values → ✅ Check for undefined before operations  
❌ Assuming items exist → ✅ Always handle NotFound errors gracefully
❌ Ignoring DynamoDB limits → ✅ Batch operations max 25 items
❌ Hardcoding table names → ✅ Use SST Resource bindings

## PATTERNS TO FOLLOW

### Entity Operations
```typescript
// CORRECT: Using entity methods
const building = await BuildingEntity.get({ buildingID });

// WRONG: Raw DynamoDB
const building = await client.getItem({ TableName: "...", Key: {...} });
```

### Error Handling
```typescript
// See data/buildings.ts for proper patterns
try {
  const result = await BuildingEntity.get({ buildingID });
  return result.Item;
} catch (error) {
  if (error.code === 'ResourceNotFoundException') {
    return null; // Handle gracefully
  }
  throw error; // Re-throw unexpected errors
}
```

### Batch Operations
```typescript
// See data/units.ts for batch patterns
// Remember: max 25 items per batch
const batches = chunk(items, 25);
```

## FILE STRUCTURE

- `model.ts` - Entity definitions using dynamodb-toolbox
- `db.ts` - DynamoDB client configuration
- `buildings.ts` - Building CRUD operations
- `units.ts` - Unit CRUD operations  
- `unitTypes.ts` - Unit type CRUD operations
- `index.ts` - Module exports

## TESTING REQUIREMENTS

- Mock dynamodb-toolbox, NOT the raw DynamoDB client
- Test all error scenarios (NotFound, throttling, validation)
- Use the ModuleMocker pattern from tests/ModuleMocker.ts
- See tests/data/*.test.ts for examples