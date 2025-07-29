# API Layer Agent Guidelines

## CRITICAL RULES FOR THIS MODULE

1. **ALWAYS return proper HTTP status codes** - 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Internal Error
2. **ALWAYS validate request bodies** before processing
3. **ALWAYS use the data layer** - NEVER access DynamoDB directly
4. **ALWAYS handle errors gracefully** - return meaningful error messages
5. **NEVER expose internal errors** to clients - log them, return generic message

## COMMON MISTAKES IN API LAYER

❌ Returning 200 for all responses → ✅ Use appropriate status codes
❌ Not validating input → ✅ Validate all request parameters and bodies
❌ Exposing stack traces → ✅ Return user-friendly error messages
❌ Direct database access → ✅ Always use data layer functions
❌ Not handling CORS → ✅ SST handles CORS, don't add custom headers

## PATTERNS TO FOLLOW

### Lambda Handler Structure
```typescript
// See api/buildings.ts for patterns
export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    // 1. Extract and validate input
    const { buildingID } = event.pathParameters || {};
    if (!buildingID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing buildingID" })
      };
    }

    // 2. Call data layer
    const result = await getBuilding(buildingID);
    
    // 3. Return appropriate response
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    // 4. Handle errors properly
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
```

### Request Body Validation
```typescript
// Always validate before using
const body = JSON.parse(event.body || "{}");
if (!body.name || !body.address) {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Missing required fields" })
  };
}
```

### HTTP Methods
- GET - Retrieve resources
- POST - Create new resources (return 201)
- PUT - Update entire resource
- PATCH - Partial update
- DELETE - Remove resource (return 204)

## FILE STRUCTURE

- `index.ts` - Main API router using sst/node/api
- `buildings.ts` - Building-related endpoints
- `units.ts` - Unit-related endpoints
- `unitTypes.ts` - Unit type endpoints
- `upload.ts` - File upload handling

## TESTING REQUIREMENTS

- Mock the data layer, not the API handlers
- Test all HTTP methods and status codes
- Test validation logic thoroughly
- Test error scenarios
- Tests are completely isolated - no SST server or AWS credentials needed
- Run tests with `bun test`
- See tests/api/*.test.ts for examples